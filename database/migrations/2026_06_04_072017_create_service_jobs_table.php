<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('customer'); 
            $table->string('moto_model');
            $table->string('plate_number');
            $table->enum('stage', ['Intake', 'Disassembly', 'Tuning', 'QA', 'Release'])->default('Intake');
            $table->date('date_in');
            $table->json('specs')->nullable(); 
            $table->string('warranty_status')->default('Pending');
            $table->boolean('is_warranty_claim')->default(false);
            $table->string('mechanic_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_jobs');
    }
};