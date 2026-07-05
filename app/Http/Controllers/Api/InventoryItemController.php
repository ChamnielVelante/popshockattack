<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    /**
     * All inventory items (each row includes the computed is_low_stock flag).
     */
    public function index(): JsonResponse
    {
        return response()->json(InventoryItem::all());
    }

    /**
     * Only the items at or below their restock threshold.
     */
    public function lowStock(): JsonResponse
    {
        return response()->json(
            InventoryItem::whereColumn('stock', '<=', 'threshold')->get()
        );
    }

    /**
     * Add a new consumable to the catalog.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_no' => 'required|string|max:50|unique:inventory_items,item_no',
            'name' => 'required|string|max:255|unique:inventory_items,name',
            'description' => 'required|string|max:255',
            'stock' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        $item = InventoryItem::create($validated);

        return response()->json(['message' => 'Item added successfully', 'item' => $item], 201);
    }

    /**
     * Update an item.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = InventoryItem::find($id);

        if (! $item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('inventory_items', 'name')->ignore($item->id)],
            'description' => 'required|string|max:255',
            'stock' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        $item->update($validated);

        return response()->json(['message' => 'Item updated successfully', 'item' => $item]);
    }

    /**
     * Top up an item's stock without resending the whole record.
     */
    public function addStock(Request $request, int $id): JsonResponse
    {
        $item = InventoryItem::find($id);

        if (! $item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        $validated = $request->validate([
            'qty' => 'required|integer|min:1',
        ]);

        $item->increment('stock', $validated['qty']);

        return response()->json(['message' => 'Stock added successfully', 'item' => $item->fresh()]);
    }

    /**
     * Remove an item from the catalog.
     */
    public function destroy(int $id): JsonResponse
    {
        $item = InventoryItem::find($id);

        if (! $item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        $item->delete();

        return response()->json(['message' => 'Item successfully deleted']);
    }
}
