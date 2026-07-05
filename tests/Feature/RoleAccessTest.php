<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $username, string $role): AppUser
    {
        return AppUser::create([
            'username' => $username,
            'password' => 'secret123',
            'role' => $role,
            'status' => 'approved',
        ]);
    }

    public function test_guests_are_blocked_from_the_job_board(): void
    {
        $this->getJson('/api/jobs')->assertUnauthorized();
    }

    public function test_customers_cannot_access_shop_operations(): void
    {
        Sanctum::actingAs($this->makeUser('rider', 'customer'));

        $this->getJson('/api/jobs')->assertForbidden();
        $this->getJson('/api/inventory')->assertForbidden();
    }

    public function test_customers_only_see_their_own_jobs(): void
    {
        $mine = $this->makeUser('rider_one', 'customer');
        $other = $this->makeUser('rider_two', 'customer');

        ServiceJob::create([
            'customer' => 'rider_one', 'app_user_id' => $mine->id,
            'moto_model' => 'Honda Click 125', 'plate_number' => 'AAA-1111',
            'stage' => 'Intake', 'date_in' => '2026-07-01',
        ]);
        ServiceJob::create([
            'customer' => 'rider_two', 'app_user_id' => $other->id,
            'moto_model' => 'Yamaha NMAX', 'plate_number' => 'BBB-2222',
            'stage' => 'Intake', 'date_in' => '2026-07-01',
        ]);

        Sanctum::actingAs($mine);

        $this->getJson('/api/my-jobs')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['plate_number' => 'AAA-1111'])
            ->assertJsonMissing(['plate_number' => 'BBB-2222']);
    }

    public function test_staff_cannot_manage_user_accounts(): void
    {
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->postJson('/api/users', [
            'username' => 'sneaky', 'password' => 'secret123', 'role' => 'admin',
        ])->assertForbidden();
    }

    public function test_staff_can_access_the_job_board(): void
    {
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->getJson('/api/jobs')->assertOk();
    }
}
