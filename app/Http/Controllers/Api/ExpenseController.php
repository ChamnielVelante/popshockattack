<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    /**
     * All logged shop expenses, most recent first.
     */
    public function index(): JsonResponse
    {
        return response()->json(Expense::orderByDesc('date')->get());
    }

    /**
     * Record a new shop expense.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'date' => 'nullable|date',
        ]);

        $expense = Expense::create([
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'date' => $validated['date'] ?? now()->toDateString(),
        ]);

        return response()->json(['message' => 'Expense recorded successfully', 'expense' => $expense], 201);
    }
}
