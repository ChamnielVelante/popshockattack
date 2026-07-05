<?php

use Illuminate\Support\Facades\Route;

// The MotoTrack frontend is the static app in public/index.html
Route::get('/', function () {
    return redirect('/index.html');
});
