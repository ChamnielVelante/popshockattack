<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\InventoryItem;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function actAsStaff(): void
    {
        Sanctum::actingAs(AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
        ]));
    }

    private function makeJob(string $stage = 'Intake'): ServiceJob
    {
        return ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Suzuki Raider 150',
            'plate_number' => 'TST-0001',
            'stage' => $stage,
            'date_in' => '2026-07-05',
        ]);
    }

    public function test_staff_can_register_a_new_intake(): void
    {
        $this->actAsStaff();

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Honda Beat',
            'plate' => 'NEW-0001',
            'dateIn' => '2026-07-05',
        ])->assertCreated();

        $this->assertDatabaseHas('service_jobs', [
            'plate_number' => 'NEW-0001',
            'stage' => 'Intake',
        ]);
    }

    public function test_releasing_a_job_starts_the_six_month_warranty(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('QA');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        $job->refresh();
        $this->assertNotNull($job->warranty_expires_at);
        $this->assertTrue($job->warranty_expires_at->isSameDay(now()->addMonths(6)));
        $this->assertStringStartsWith('Active', $job->warranty_status);
    }

    public function test_invalid_stage_names_are_rejected(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'NotARealStage'])
            ->assertUnprocessable();
    }

    public function test_logging_specs_deducts_consumables_and_advances_to_qa(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Tuning');

        InventoryItem::create([
            'item_no' => '000001', 'name' => 'Daily Oil', 'description' => 'Standard oil',
            'stock' => 10, 'threshold' => 3, 'price' => 150,
        ]);
        InventoryItem::create([
            'item_no' => '000002', 'name' => 'Oil Seal 41x54x11', 'description' => 'Front fork seal',
            'stock' => 5, 'threshold' => 2, 'price' => 300,
        ]);

        $this->putJson("/api/jobs/{$job->id}/specs", [
            'enginePrice' => 1500,
            'totalBill' => 2100,
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
        ])->assertOk();

        $this->assertSame('QA', $job->fresh()->stage);
        $this->assertSame(9, InventoryItem::where('name', 'Daily Oil')->first()->stock);
        $this->assertSame(3, InventoryItem::where('name', 'Oil Seal 41x54x11')->first()->stock);
    }
}
