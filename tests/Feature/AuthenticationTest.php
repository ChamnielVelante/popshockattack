<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $overrides = []): AppUser
    {
        return AppUser::create(array_merge([
            'username' => 'owner',
            'password' => 'secret123',
            'role' => 'admin',
            'status' => 'approved',
        ], $overrides));
    }

    public function test_valid_credentials_return_a_token(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'username', 'role']]);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_pending_accounts_cannot_log_in(): void
    {
        $this->makeUser(['username' => 'newcustomer', 'role' => 'customer', 'status' => 'pending']);

        $this->postJson('/api/login', [
            'username' => 'newcustomer',
            'password' => 'secret123',
        ])->assertForbidden();
    }

    public function test_password_hash_is_never_exposed_in_responses(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->assertOk()->assertJsonMissingPath('user.password');
    }

    public function test_self_registration_creates_a_pending_customer(): void
    {
        $this->postJson('/api/register', [
            'username' => 'juan_rider2',
            'password' => 'ridesafe',
        ])->assertCreated();

        $this->assertDatabaseHas('app_users', [
            'username' => 'juan_rider2',
            'role' => 'customer',
            'status' => 'pending',
        ]);
    }
}
