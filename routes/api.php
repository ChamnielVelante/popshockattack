<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\ServiceJob;
use App\Models\InventoryItem;
use App\Models\AppUser;

// Route to get all inventory items
Route::get('/inventory', function () {
    return response()->json(InventoryItem::all());
});

// Route to ADD a new inventory item
Route::post('/inventory', function (Request $request) {
    $item = InventoryItem::create([
        'item_no' => $request->item_no,
        'name' => $request->name,
        'description' => $request->description,
        'stock' => $request->stock,
        'threshold' => $request->threshold,
        'price' => $request->price
    ]);
    
    return response()->json(['message' => 'Item added successfully', 'item' => $item]);
});

// Route to EDIT an existing inventory item
// We use the item's name to find it, since your frontend form uses the name as the primary identifier
Route::put('/inventory/{name}', function (Request $request, $name) {
    $item = InventoryItem::where('name', $name)->first();
    
    if (!$item) {
        return response()->json(['message' => 'Item not found'], 404);
    }
    
    $item->name = $request->name;
    $item->description = $request->description;
    $item->stock = $request->stock;
    $item->threshold = $request->threshold;
    $item->price = $request->price;
    $item->save();
    
    return response()->json(['message' => 'Item updated successfully', 'item' => $item]);
});

// Route to get all jobs
Route::get('/jobs', function () {
    return response()->json(ServiceJob::all());
});

// Route to save a new Intake to the database
Route::post('/jobs', function (Request $request) {
    $job = ServiceJob::create([
        'customer' => $request->customer,
        'moto_model' => $request->moto,
        'plate_number' => $request->plate,
        'stage' => 'Intake',
        'date_in' => $request->dateIn
    ]);
    
    return response()->json(['message' => 'Job successfully saved!', 'job' => $job]);
});

// Route to update a job's Kanban stage
Route::put('/jobs/{id}/stage', function (Request $request, $id) {
    $job = ServiceJob::find($id);
    
    if (!$job) {
        return response()->json(['message' => 'Job not found'], 404);
    }
    
    $job->stage = $request->stage;
    
    if ($request->stage === 'Release') {
        $job->warranty_status = 'Active (Expires ' . date('m/d/Y', strtotime('+6 months')) . ')';
    }
    
    $job->save();
    
    return response()->json(['message' => 'Stage updated successfully', 'job' => $job]);
});

// Route to log tuning specs, compute the bill, AND deduct inventory
Route::put('/jobs/{id}/specs', function (Request $request, $id) {
    $job = ServiceJob::find($id);
    
    if (!$job) {
        return response()->json(['message' => 'Job not found'], 404);
    }
    
    $job->specs = [
        'enginePrice' => $request->enginePrice,
        'totalBill' => $request->totalBill,
        'oil' => $request->oil,
        'oilSeal' => $request->oilSeal,
        'dustSeal' => $request->dustSeal,
        'springs' => $request->springs
    ];
    
    $job->is_warranty_claim = $request->isWarranty;
    $job->stage = 'QA'; 
    $job->save();

    // ==========================================
    // AUTO-DEDUCT INVENTORY LOGIC
    // ==========================================
    if ($request->rawOil && $request->rawOil !== 'None') {
        InventoryItem::where('name', $request->rawOil)->decrement('stock', 1);
    }
    
    if ($request->rawOsSize && $request->rawOsSize !== 'None') {
        InventoryItem::where('name', $request->rawOsSize)->decrement('stock', $request->rawOsQty);
    }
    
    if ($request->rawDsSize && $request->rawDsSize !== 'None') {
        InventoryItem::where('name', $request->rawDsSize)->decrement('stock', $request->rawDsQty);
    }
    
    if ($request->rawSprings && $request->rawSprings !== 'None') {
        InventoryItem::where('name', $request->rawSprings)->decrement('stock', 1);
    }
    
    return response()->json(['message' => 'Specs logged and inventory deducted!', 'job' => $job]);
});

// Route to cancel and delete a job
Route::delete('/jobs/{id}', function ($id) {
    $job = ServiceJob::find($id);
    
    if (!$job) {
        return response()->json(['message' => 'Job not found'], 404);
    }
    
    $job->delete();
    
    return response()->json(['message' => 'Job successfully deleted']);
});


// Route to get all users
Route::get('/users', function () {
    return response()->json(AppUser::all());
});

// Route for Customer Registration
Route::post('/register', function (Request $request) {
    if (AppUser::where('username', $request->username)->exists()) {
        return response()->json(['message' => 'Username already taken'], 409);
    }
    
    // Explicitly create the user with status
    $user = new AppUser();
    $user->username = $request->username;
    $user->password = $request->password;
    $user->role = 'customer';
    $user->status = 'pending'; // Force it to pending
    $user->save();

    $savedUser = AppUser::find($user->id);
    
    return response()->json(['message' => 'Registered successfully', 'user' => $user]);
});

// Updated Login Route (Checks for Approval)
Route::post('/login', function (Request $request) {
    $user = AppUser::where('username', $request->username)
                   ->where('password', $request->password)
                   ->first();
    
    if ($user) {
        if ($user->status === 'pending') {
            return response()->json(['message' => 'Account pending staff approval.'], 403);
        }
        return response()->json(['message' => 'Login successful', 'user' => $user]);
    }
    
    return response()->json(['message' => 'Invalid credentials'], 401);
});

// Route for Staff to Approve Users
Route::put('/users/{id}/approve', function ($id) {
    $user = AppUser::find($id);
    if($user) {
        $user->status = 'approved';
        $user->save();
        return response()->json(['message' => 'User approved!']);
    }
    return response()->json(['message' => 'User not found'], 404);
});

// Route to update a job's assigned mechanic
Route::put('/jobs/{id}/mechanic', function (Request $request, $id) {
    $job = ServiceJob::find($id);
    
    if (!$job) {
        return response()->json(['message' => 'Job not found'], 404);
    }
    
    // Save the mechanic's name to the database
    $job->mechanic_name = $request->mechanic; 
    $job->save();
    
    return response()->json(['message' => 'Mechanic assigned successfully', 'job' => $job]);
});