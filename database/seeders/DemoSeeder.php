<?php

namespace Database\Seeders;

use App\Models\AppUser;
use App\Models\Expense;
use App\Models\ServiceJob;
use App\Services\BillingService;
use Illuminate\Database\Seeder;

/**
 * Optional presentation data: three months of released jobs, active units on
 * every stage of the board, and shop expenses — so the dashboard, charts,
 * and reports look alive during a demo.
 *
 * Run with:  php artisan db:seed --class=DemoSeeder
 * Re-running replaces previously seeded demo records (DEMO-* plates).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $billing = new BillingService;

        // Re-runnable: clear anything this seeder created before
        ServiceJob::where('plate_number', 'like', 'DEMO-%')->delete();
        Expense::where('description', 'like', '[Demo]%')->delete();

        // A couple of extra customer accounts so user management looks real
        $customers = collect([
            ['username' => 'juan_rider', 'password' => 'pass123'],
            ['username' => 'maria_rides', 'password' => 'pass123'],
            ['username' => 'carlo_moto', 'password' => 'pass123'],
        ])->map(fn ($data) => AppUser::firstOrCreate(
            ['username' => $data['username']],
            ['password' => $data['password'], 'role' => 'customer', 'status' => 'approved'],
        ));

        $mechanics = ['John Hendrix', 'Vince Sael', 'Dhax Allen', 'Jan Cairo'];
        $units = [
            ['Honda Click 125', 1500], ['Yamaha NMAX 155', 1500], ['Honda Beat', 1200],
            ['Suzuki Raider 150', 1500], ['Yamaha Mio Sporty', 1200], ['Kawasaki Barako II', 1500],
            ['Honda ADV 160', 2500], ['Yamaha MT-15', 2800], ['Kawasaki Ninja 400', 4500],
            ['Rusi Classic 250', 1500], ['Suzuki Burgman Street', 1500], ['Honda XRM 125', 1200],
        ];
        $oils = ['Daily Oil', 'Touring Oil', 'Racing Oil'];
        $sealSizes = ['Oil Seal 12x31x10.5', 'Oil Seal 15x35x10', 'Oil Seal 41x54x11'];

        // --- 12 released jobs spread over the last ~90 days ---
        foreach ($units as $i => [$moto, $basePrice]) {
            $customer = $customers[$i % 3];
            $daysAgo = 90 - ($i * 7) - ($i % 3);          // roughly weekly, oldest first
            $dateIn = now()->subDays($daysAgo);
            $isClaim = in_array($i, [4, 9]);              // two back-jobs for the analytics
            $sealQty = ($i % 3 === 0) ? 0 : 2;
            $seal = $sealQty > 0 ? $sealSizes[$i % 3] : 'None';
            $springs = ($i % 4 === 0) ? 'Lowering Spring 1.5 inch' : 'None';

            $total = $billing->computeTotal(
                enginePrice: $basePrice,
                isWarrantyClaim: $isClaim,
                oilSealSize: $seal,
                oilSealQty: $sealQty,
                dustSealSize: 'None',
                dustSealQty: 0,
                springs: $springs,
            );

            ServiceJob::create([
                'customer' => $customer->username,
                'app_user_id' => $customer->id,
                'moto_model' => $moto,
                'plate_number' => sprintf('DEMO-%04d', $i + 1),
                'stage' => 'Release',
                'date_in' => $dateIn->toDateString(),
                'mechanic_name' => $mechanics[$i % 4],
                'is_warranty_claim' => $isClaim,
                'specs' => [
                    'enginePrice' => $basePrice,
                    'totalBill' => $total,
                    'oil' => $oils[$i % 3],
                    'oilSeal' => $seal === 'None' ? 'None' : "{$seal} ({$sealQty} - Both)",
                    'dustSeal' => 'None',
                    'springs' => $springs,
                ],
                'warranty_expires_at' => $dateIn->copy()->addDays(3)->addMonths(config('shop.warranty_months')),
            ]);
        }

        // --- Active units on every stage of the board ---
        $active = [
            ['Honda PCX 160', 'Intake'],
            ['Yamaha Aerox 155', 'Disassembly'],
            ['Suzuki Gixxer 155', 'Tuning'],
            ['Honda Click 160', 'QA'],
        ];
        foreach ($active as $i => [$moto, $stage]) {
            $customer = $customers[$i % 3];
            ServiceJob::create([
                'customer' => $customer->username,
                'app_user_id' => $customer->id,
                'moto_model' => $moto,
                'plate_number' => sprintf('DEMO-%04d', 100 + $i),
                'stage' => $stage,
                'date_in' => now()->subDays(3 - $i)->toDateString(),
                'mechanic_name' => $stage === 'Intake' ? null : $mechanics[$i % 4],
            ]);
        }

        // --- Shop expenses across the same months ---
        $expenses = [
            ['[Demo] Shop electricity bill', 2200, 80],
            ['[Demo] Restock fork oil supplier', 4500, 72],
            ['[Demo] Replacement hand tools', 1800, 55],
            ['[Demo] Shop electricity bill', 2350, 50],
            ['[Demo] Seal supplier delivery', 3600, 38],
            ['[Demo] Compressor maintenance', 1500, 24],
            ['[Demo] Shop electricity bill', 2280, 19],
            ['[Demo] Restock lowering springs', 5200, 6],
        ];
        foreach ($expenses as [$description, $amount, $daysAgo]) {
            Expense::create([
                'description' => $description,
                'amount' => $amount,
                'date' => now()->subDays($daysAgo)->toDateString(),
            ]);
        }
    }
}
