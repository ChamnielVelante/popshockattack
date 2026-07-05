<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppUser;
use App\Models\InventoryItem;
use App\Models\ServiceJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceJobController extends Controller
{
    /**
     * Full job board for admin/staff.
     */
    public function index(): JsonResponse
    {
        return response()->json(ServiceJob::all());
    }

    /**
     * Jobs belonging to the logged-in customer only.
     */
    public function myJobs(Request $request): JsonResponse
    {
        return response()->json(
            ServiceJob::where('app_user_id', $request->user()->id)->get()
        );
    }

    /**
     * Register a new intake and link it to the customer's account when one exists,
     * so the customer portal can show it without exposing other customers' jobs.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer' => 'required|string|max:255',
            'moto' => 'required|string|max:255',
            'plate' => 'required|string|max:255',
            'dateIn' => 'required|date',
        ]);

        $customerAccount = AppUser::where('username', $validated['customer'])
            ->where('role', 'customer')
            ->first();

        $job = ServiceJob::create([
            'customer' => $validated['customer'],
            'app_user_id' => $customerAccount?->id,
            'moto_model' => $validated['moto'],
            'plate_number' => $validated['plate'],
            'stage' => 'Intake',
            'date_in' => $validated['dateIn'],
        ]);

        return response()->json(['message' => 'Job successfully saved!', 'job' => $job], 201);
    }

    /**
     * Move a job through the Kanban stages. Reaching Release starts
     * the 6-month warranty window.
     */
    public function updateStage(Request $request, int $id): JsonResponse
    {
        $job = ServiceJob::find($id);

        if (! $job) {
            return response()->json(['message' => 'Job not found'], 404);
        }

        $validated = $request->validate([
            'stage' => 'required|in:Intake,Disassembly,Tuning,QA,Release',
        ]);

        $job->stage = $validated['stage'];

        if ($validated['stage'] === 'Release') {
            $job->warranty_expires_at = now()->addMonths(6);
        }

        $job->save();

        return response()->json(['message' => 'Stage updated successfully', 'job' => $job]);
    }

    /**
     * Log tuning specs and billing, advance the job to QA, and deduct
     * the consumables used from inventory.
     */
    public function updateSpecs(Request $request, int $id): JsonResponse
    {
        $job = ServiceJob::find($id);

        if (! $job) {
            return response()->json(['message' => 'Job not found'], 404);
        }

        $validated = $request->validate([
            'enginePrice' => 'required|numeric|min:0',
            'totalBill' => 'required|numeric|min:0',
            'oil' => 'required|string',
            'oilSeal' => 'required|string',
            'dustSeal' => 'required|string',
            'springs' => 'required|string',
            'isWarranty' => 'required|boolean',
            'rawOil' => 'nullable|string',
            'rawOsSize' => 'nullable|string',
            'rawOsQty' => 'nullable|integer|min:0',
            'rawDsSize' => 'nullable|string',
            'rawDsQty' => 'nullable|integer|min:0',
            'rawSprings' => 'nullable|string',
        ]);

        $job->specs = [
            'enginePrice' => $validated['enginePrice'],
            'totalBill' => $validated['totalBill'],
            'oil' => $validated['oil'],
            'oilSeal' => $validated['oilSeal'],
            'dustSeal' => $validated['dustSeal'],
            'springs' => $validated['springs'],
        ];
        $job->is_warranty_claim = $validated['isWarranty'];
        $job->stage = 'QA';
        $job->save();

        $this->deductStock($validated['rawOil'] ?? null);
        $this->deductStock($validated['rawOsSize'] ?? null, (int) ($validated['rawOsQty'] ?? 0));
        $this->deductStock($validated['rawDsSize'] ?? null, (int) ($validated['rawDsQty'] ?? 0));
        $this->deductStock($validated['rawSprings'] ?? null);

        return response()->json(['message' => 'Specs logged and inventory deducted!', 'job' => $job]);
    }

    /**
     * Assign (or unassign) the mechanic responsible for a job.
     */
    public function assignMechanic(Request $request, int $id): JsonResponse
    {
        $job = ServiceJob::find($id);

        if (! $job) {
            return response()->json(['message' => 'Job not found'], 404);
        }

        $validated = $request->validate([
            'mechanic' => 'nullable|string|max:255',
        ]);

        $job->mechanic_name = $validated['mechanic'] ?? null;
        $job->save();

        return response()->json(['message' => 'Mechanic assigned successfully', 'job' => $job]);
    }

    /**
     * Cancel and permanently delete a job.
     */
    public function destroy(int $id): JsonResponse
    {
        $job = ServiceJob::find($id);

        if (! $job) {
            return response()->json(['message' => 'Job not found'], 404);
        }

        $job->delete();

        return response()->json(['message' => 'Job successfully deleted']);
    }

    /**
     * Decrement stock for a named consumable. "None" and empty values are skipped.
     */
    private function deductStock(?string $name, int $qty = 1): void
    {
        if ($name && $name !== 'None' && $qty > 0) {
            InventoryItem::where('name', $name)->decrement('stock', $qty);
        }
    }
}
