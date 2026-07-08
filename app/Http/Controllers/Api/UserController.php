<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\AppUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * List every account (admin + staff; staff needs it for pending approvals).
     */
    public function index(): JsonResponse
    {
        return response()->json(UserResource::collection(AppUser::all()));
    }

    /**
     * Approve a pending customer registration.
     */
    public function approve(AppUser $user): JsonResponse
    {
        $user->status = 'approved';
        $user->save();

        return response()->json([
            'message' => 'User approved!',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Owner creates an account directly, pre-approved and with any role.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = AppUser::create([
            'username' => $validated['username'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'status' => 'approved',
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * Update an account's username, role, and optionally its password.
     */
    public function update(UpdateUserRequest $request, AppUser $user): JsonResponse
    {
        $validated = $request->validated();

        $user->username = $validated['username'];
        $user->role = $validated['role'];

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Delete an account (an admin cannot delete their own).
     */
    public function destroy(Request $request, AppUser $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
