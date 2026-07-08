<?php

namespace App\Notifications;

use App\Models\ServiceJob;
use Illuminate\Notifications\Notification;

class JobStageChanged extends Notification
{
    public function __construct(
        private readonly ServiceJob $job,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Stored as JSON in the notifications table and served to the
     * bell dropdown in the frontend.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'job_id' => $this->job->id,
            'moto_model' => $this->job->moto_model,
            'plate_number' => $this->job->plate_number,
            'stage' => $this->job->stage,
            'message' => $this->job->stage === 'Release'
                ? "{$this->job->moto_model} ({$this->job->plate_number}) is complete and ready for release!"
                : "{$this->job->moto_model} ({$this->job->plate_number}) moved to {$this->job->stage}.",
        ];
    }
}
