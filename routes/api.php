<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ServiceJobController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Authenticated routes (Authorization: Bearer <token>)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Notifications (every role has their own)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/mark-read', [NotificationController::class, 'markAllRead']);

    // Customer portal
    Route::middleware('role:customer')->group(function () {
        Route::get('/my-jobs', [ServiceJobController::class, 'myJobs']);
    });

    // Shop operations (owner + staff)
    Route::middleware('role:admin,staff')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{user}/approve', [UserController::class, 'approve']);

        Route::get('/inventory', [InventoryItemController::class, 'index']);
        Route::get('/inventory/low-stock', [InventoryItemController::class, 'lowStock']);

        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::post('/expenses', [ExpenseController::class, 'store']);

        Route::get('/jobs', [ServiceJobController::class, 'index']);
        Route::post('/jobs', [ServiceJobController::class, 'store']);
        Route::put('/jobs/{job}/stage', [ServiceJobController::class, 'updateStage']);
        Route::put('/jobs/{job}/specs', [ServiceJobController::class, 'updateSpecs']);
        Route::put('/jobs/{job}/mechanic', [ServiceJobController::class, 'assignMechanic']);
        Route::delete('/jobs/{job}', [ServiceJobController::class, 'destroy']);
    });

    // Owner-only management
    Route::middleware('role:admin')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::post('/inventory', [InventoryItemController::class, 'store']);
        Route::put('/inventory/{item}/add-stock', [InventoryItemController::class, 'addStock']);
        Route::put('/inventory/{item}', [InventoryItemController::class, 'update']);
        Route::delete('/inventory/{item}', [InventoryItemController::class, 'destroy']);
    });
});
