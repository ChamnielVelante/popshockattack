<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use App\Notifications\JobStageChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingAndNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private AppUser $staff;

    private AppUser $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = AppUser::create([
            'username' => 'tech', 'password' => 'secret123',
            'role' => 'staff', 'status' => 'approved',
        ]);
        $this->customer = AppUser::create([
            'username' => 'juan_tester', 'password' => 'secret123',
            'role' => 'customer', 'status' => 'approved',
        ]);

        Sanctum::actingAs($this->staff);
    }

    private function makeJob(): ServiceJob
    {
        return ServiceJob::create([
            'customer' => $this->customer->username,
            'app_user_id' => $this->customer->id,
            'moto_model' => 'Yamaha NMAX',
            'plate_number' => 'ABC-1234',
            'stage' => 'Tuning',
            'date_in' => '2026-07-06',
        ]);
    }

    private function specsPayload(array $overrides = []): array
    {
        return array_merge([
            'enginePrice' => 1500,
            'oil' => 'Daily Oil',
            'oilSeal' => 'Oil Seal 41x54x11 (2 - Both)',
            'dustSeal' => 'None',
            'springs' => 'None',
            'isWarranty' => false,
            'rawOil' => 'Daily Oil',
            'rawOsSize' => 'Oil Seal 41x54x11',
            'rawOsQty' => 2,
            'rawDsSize' => 'None',
            'rawDsQty' => 0,
            'rawSprings' => 'None',
        ], $overrides);
    }

    public function test_bill_is_computed_server_side_and_a_tampered_total_is_ignored(): void
    {
        $job = $this->makeJob();

        // A tampered client claims the bill is ₱1; the server must recompute:
        // ₱1,500 base + 2 oil seals x ₱300 (small class) = ₱2,100.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'totalBill' => 1,
        ]))->assertOk();

        $this->assertEquals(2100, $job->fresh()->specs['totalBill']);
    }

    public function test_big_bike_classes_use_the_higher_oil_seal_price(): void
    {
        $job = $this->makeJob();

        // ₱4,500 base + 2 oil seals x ₱500 (big-bike class) = ₱5,500.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'enginePrice' => 4500,
        ]))->assertOk();

        $this->assertEquals(5500, $job->fresh()->specs['totalBill']);
    }

    public function test_warranty_claims_are_billed_zero(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'isWarranty' => true,
        ]))->assertOk();

        $fresh = $job->fresh();
        $this->assertEquals(0, $fresh->specs['totalBill']);
        $this->assertTrue($fresh->is_warranty_claim);
    }

    public function test_unknown_engine_class_prices_are_rejected(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'enginePrice' => 999999,
        ]))->assertUnprocessable();
    }

    public function test_stage_change_notifies_the_customer_and_the_owner_but_not_the_actor(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        Notification::assertSentTo($this->customer, JobStageChanged::class);
        Notification::assertSentTo($owner, JobStageChanged::class);
        Notification::assertNotSentTo($this->staff, JobStageChanged::class);
    }

    public function test_users_can_fetch_and_clear_their_notifications(): void
    {
        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        $job = $this->makeJob();
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        Sanctum::actingAs($this->customer);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.data.stage', 'Release');

        $this->putJson('/api/notifications/mark-read')->assertOk();

        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
    }

    public function test_logout_revokes_the_token(): void
    {
        $token = $this->staff->createToken('api-token')->plainTextToken;

        // Real HTTP-style calls with the bearer header (not actingAs) so the
        // revocation path is exercised end-to-end.
        $this->flushHeaders();
        app('auth')->forgetGuards();

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        app('auth')->forgetGuards();
        $this->withToken($token)->getJson('/api/jobs')->assertUnauthorized();
    }
}
