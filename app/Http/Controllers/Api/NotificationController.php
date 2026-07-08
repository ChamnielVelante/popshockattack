<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * The logged-in user's latest notifications plus their unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'notifications' => $user->notifications()->latest()->take(20)->get(),
        ]);
    }

    /**
     * Mark every unread notification as read (called when the bell is opened).
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Notifications marked as read']);
    }
}
