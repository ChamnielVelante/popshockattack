<?php

namespace App\Http\Controllers\Api;

use App\Enums\JobStage;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignMechanicRequest;
use App\Http\Requests\StoreJobRequest;
use App\Http\Requests\UpdateSpecsRequest;
use App\Http\Requests\UpdateStageRequest;
use App\Http\Resources\ServiceJobResource;
use App\Models\AppUser;
use App\Models\ServiceJob;
use App\Notifications\JobStageChanged;
use App\Services\BillingService;
use App\Services\InventoryDeductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ServiceJobController extends Controller
{
    public function __construct(
        private readonly BillingService $billing,
        private readonly InventoryDeductionService $inventory,
    ) {}

    /**
     * Full job board for admin/staff.
     */
    public function index(): JsonResponse
    {
        return response()->json(ServiceJobResource::collection(ServiceJob::all()));
    }

    /**
     * Jobs belonging to the logged-in customer only.
     */
    public function myJobs(Request $request): JsonResponse
    {
        return response()->json(ServiceJobResource::collection(
            ServiceJob::where('app_user_id', $request->user()->id)->get()
        ));
    }

    /**
     * Register a new intake and link it to the customer's account when one exists,
     * so the customer portal can show it without exposing other customers' jobs.
     */
    public function store(StoreJobRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $customerAccount = AppUser::where('username', $validated['customer'])
            ->where('role', UserRole::Customer->value)
            ->first();

        $job = ServiceJob::create([
            'customer' => $validated['customer'],
            'app_user_id' => $customerAccount?->id,
            'moto_model' => $validated['moto'],
            'plate_number' => $validated['plate'],
            'stage' => JobStage::Intake->value,
            'date_in' => $validated['dateIn'],
        ]);

        return response()->json([
            'message' => 'Job successfully saved!',
            'job' => new ServiceJobResource($job),
        ], 201);
    }

    /**
     * Move a job through the Kanban stages. Reaching Release starts the
     * warranty window. The owner and the job's customer are notified.
     */
    public function updateStage(UpdateStageRequest $request, ServiceJob $job): JsonResponse
    {
        $job->stage = $request->validated()['stage'];

        if ($job->stage === JobStage::Release->value) {
            $job->warranty_expires_at = now()->addMonths(config('shop.warranty_months'));
        }

        $job->save();

        $this->notifyStageChange($job, $request);

        return response()->json([
            'message' => 'Stage updated successfully',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Log tuning specs, compute the bill server-side, advance the job to QA,
     * and deduct the consumables used from inventory — atomically.
     */
    public function updateSpecs(UpdateSpecsRequest $request, ServiceJob $job): JsonResponse
    {
        $validated = $request->validated();

        // The bill is always computed here, never taken from the client,
        // so a tampered request cannot underpay a job.
        $totalBill = $this->billing->computeTotal(
            enginePrice: (int) $validated['enginePrice'],
            isWarrantyClaim: (bool) $validated['isWarranty'],
            oilSealSize: $validated['rawOsSize'] ?? null,
            oilSealQty: (int) ($validated['rawOsQty'] ?? 0),
            dustSealSize: $validated['rawDsSize'] ?? null,
            dustSealQty: (int) ($validated['rawDsQty'] ?? 0),
            springs: $validated['rawSprings'] ?? null,
        );

        // Job update and stock deduction succeed or fail together.
        DB::transaction(function () use ($job, $validated, $totalBill) {
            $job->specs = [
                'enginePrice' => (int) $validated['enginePrice'],
                'totalBill' => $totalBill,
                'oil' => $validated['oil'],
                'oilSeal' => $validated['oilSeal'],
                'dustSeal' => $validated['dustSeal'],
                'springs' => $validated['springs'],
            ];
            $job->is_warranty_claim = (bool) $validated['isWarranty'];
            $job->stage = JobStage::QA->value;
            $job->save();

            $this->inventory->deductForSpecs(
                oil: $validated['rawOil'] ?? null,
                oilSealSize: $validated['rawOsSize'] ?? null,
                oilSealQty: (int) ($validated['rawOsQty'] ?? 0),
                dustSealSize: $validated['rawDsSize'] ?? null,
                dustSealQty: (int) ($validated['rawDsQty'] ?? 0),
                springs: $validated['rawSprings'] ?? null,
            );
        });

        $this->notifyStageChange($job, $request);

        return response()->json([
            'message' => 'Specs logged and inventory deducted!',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Assign (or unassign) the mechanic responsible for a job.
     */
    public function assignMechanic(AssignMechanicRequest $request, ServiceJob $job): JsonResponse
    {
        $job->mechanic_name = $request->validated()['mechanic'] ?? null;
        $job->save();

        return response()->json([
            'message' => 'Mechanic assigned successfully',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Cancel and permanently delete a job.
     */
    public function destroy(ServiceJob $job): JsonResponse
    {
        $job->delete();

        return response()->json(['message' => 'Job successfully deleted']);
    }

    /**
     * Notify the owner(s) and the job's customer about a stage change,
     * skipping whoever performed the action.
     */
    private function notifyStageChange(ServiceJob $job, Request $request): void
    {
        $recipients = AppUser::where('role', UserRole::Admin->value)
            ->where('id', '!=', $request->user()->id)
            ->get();

        if ($job->app_user_id && $job->app_user_id !== $request->user()->id) {
            $customer = AppUser::find($job->app_user_id);
            if ($customer) {
                $recipients->push($customer);
            }
        }

        Notification::send($recipients, new JobStageChanged($job));
    }
}
