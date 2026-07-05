<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryItemController;
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

    // Customer portal
    Route::middleware('role:customer')->group(function () {
        Route::get('/my-jobs', [ServiceJobController::class, 'myJobs']);
    });

    // Shop operations (owner + staff)
    Route::middleware('role:admin,staff')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{id}/approve', [UserController::class, 'approve']);

        Route::get('/inventory', [InventoryItemController::class, 'index']);
        Route::get('/inventory/low-stock', [InventoryItemController::class, 'lowStock']);

        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::post('/expenses', [ExpenseController::class, 'store']);

        Route::get('/jobs', [ServiceJobController::class, 'index']);
        Route::post('/jobs', [ServiceJobController::class, 'store']);
        Route::put('/jobs/{id}/stage', [ServiceJobController::class, 'updateStage']);
        Route::put('/jobs/{id}/specs', [ServiceJobController::class, 'updateSpecs']);
        Route::put('/jobs/{id}/mechanic', [ServiceJobController::class, 'assignMechanic']);
        Route::delete('/jobs/{id}', [ServiceJobController::class, 'destroy']);
    });

    // Owner-only management
    Route::middleware('role:admin')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        Route::post('/inventory', [InventoryItemController::class, 'store']);
        Route::put('/inventory/{id}/add-stock', [InventoryItemController::class, 'addStock']);
        Route::put('/inventory/{id}', [InventoryItemController::class, 'update']);
        Route::delete('/inventory/{id}', [InventoryItemController::class, 'destroy']);
    });
});
