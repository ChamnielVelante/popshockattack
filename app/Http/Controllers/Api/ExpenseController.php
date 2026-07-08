<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;

class ExpenseController extends Controller
{
    /**
     * All logged shop expenses, most recent first.
     */
    public function index(): JsonResponse
    {
        return response()->json(ExpenseResource::collection(
            Expense::orderByDesc('date')->get()
        ));
    }

    /**
     * Record a new shop expense.
     */
    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $expense = Expense::create([
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'date' => $validated['date'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Expense recorded successfully',
            'expense' => new ExpenseResource($expense),
        ], 201);
    }
}
