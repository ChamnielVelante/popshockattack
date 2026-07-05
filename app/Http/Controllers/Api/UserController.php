<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * List every account (admin + staff; staff needs it for pending approvals).
     */
    public function index(): JsonResponse
    {
        return response()->json(AppUser::all());
    }

    /**
     * Approve a pending customer registration.
     */
    public function approve(int $id): JsonResponse
    {
        $user = AppUser::find($id);

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->status = 'approved';
        $user->save();

        return response()->json(['message' => 'User approved!', 'user' => $user]);
    }

    /**
     * Owner creates an account directly, pre-approved and with any role.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|min:3|max:50|unique:app_users,username',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,staff,customer',
        ]);

        $user = AppUser::create([
            'username' => $validated['username'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'status' => 'approved',
        ]);

        return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
    }

    /**
     * Update an account's username, role, and optionally its password.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = AppUser::find($id);

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:50', Rule::unique('app_users', 'username')->ignore($user->id)],
            'role' => 'required|in:admin,staff,customer',
            'password' => 'nullable|string|min:6',
        ]);

        $user->username = $validated['username'];
        $user->role = $validated['role'];

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    }

    /**
     * Delete an account (an admin cannot delete their own).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if ((int) $id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 422);
        }

        $user = AppUser::find($id);

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
