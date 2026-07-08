<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddStockRequest;
use App\Http\Requests\StoreInventoryItemRequest;
use App\Http\Requests\UpdateInventoryItemRequest;
use App\Http\Resources\InventoryItemResource;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;

class InventoryItemController extends Controller
{
    /**
     * All inventory items (each row includes the computed is_low_stock flag).
     */
    public function index(): JsonResponse
    {
        return response()->json(InventoryItemResource::collection(InventoryItem::all()));
    }

    /**
     * Only the items at or below their restock threshold.
     */
    public function lowStock(): JsonResponse
    {
        return response()->json(InventoryItemResource::collection(
            InventoryItem::whereColumn('stock', '<=', 'threshold')->get()
        ));
    }

    /**
     * Add a new consumable to the catalog.
     */
    public function store(StoreInventoryItemRequest $request): JsonResponse
    {
        $item = InventoryItem::create($request->validated());

        return response()->json([
            'message' => 'Item added successfully',
            'item' => new InventoryItemResource($item),
        ], 201);
    }

    /**
     * Update an item.
     */
    public function update(UpdateInventoryItemRequest $request, InventoryItem $item): JsonResponse
    {
        $item->update($request->validated());

        return response()->json([
            'message' => 'Item updated successfully',
            'item' => new InventoryItemResource($item),
        ]);
    }

    /**
     * Top up an item's stock without resending the whole record.
     */
    public function addStock(AddStockRequest $request, InventoryItem $item): JsonResponse
    {
        $item->increment('stock', $request->validated()['qty']);

        return response()->json([
            'message' => 'Stock added successfully',
            'item' => new InventoryItemResource($item->fresh()),
        ]);
    }

    /**
     * Remove an item from the catalog.
     */
    public function destroy(InventoryItem $item): JsonResponse
    {
        $item->delete();

        return response()->json(['message' => 'Item successfully deleted']);
    }
}
