<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\InventoryItem;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['item_no' => '000001', 'name' => 'Daily Oil', 'description' => 'Standard oil', 'stock' => 15, 'threshold' => 5],
            ['item_no' => '000002', 'name' => 'Touring Oil', 'description' => 'Touring oil', 'stock' => 4, 'threshold' => 5], 
            ['item_no' => '000003', 'name' => 'Racing Oil', 'description' => 'Performance oil', 'stock' => 10, 'threshold' => 5],
            ['item_no' => '000004', 'name' => 'Oil Seal 12x31x10.5', 'description' => 'Seal', 'stock' => 20, 'threshold' => 8],
            ['item_no' => '000005', 'name' => 'Oil Seal 15x35x10', 'description' => 'Seal', 'stock' => 12, 'threshold' => 5],
            ['item_no' => '000006', 'name' => 'Oil Seal 41x54x11', 'description' => 'Seal', 'stock' => 5, 'threshold' => 5],
            ['item_no' => '000007', 'name' => 'Dust Seal 41x54x11', 'description' => 'Dust seal', 'stock' => 15, 'threshold' => 5],
            ['item_no' => '000008', 'name' => 'Dust Seal 43x54x11', 'description' => 'Dust seal', 'stock' => 10, 'threshold' => 5],
            ['item_no' => '000009', 'name' => 'Lowering Spring 1.0 inch', 'description' => 'Spring', 'stock' => 12, 'threshold' => 2],
            ['item_no' => '000010', 'name' => 'Lowering Spring 1.5 inch', 'description' => 'Spring', 'stock' => 8, 'threshold' => 2]
        ];

        foreach ($items as $item) {
            InventoryItem::create($item);
        }
    }
}