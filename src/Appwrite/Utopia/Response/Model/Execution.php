<?php

namespace Appwrite\Utopia\Response\Model;

use Appwrite\Utopia\Response;
use Appwrite\Utopia\Response\Model;

class Execution extends Model
{
    public function __construct()
    {
        $this
            ->addRule('$id', [
                'type' => self::TYPE_STRING,
                'description' => 'Execution ID.',
                'default' => '',
                'example' => '5e5ea5c16897e',
            ])
            ->addRule('$createdAt', [
                'type' => self::TYPE_DATETIME,
                'description' => 'Execution creation date in Datetime',
                'default' => '',
                'example' => '1975-12-06 13:30:59',
            ])
            ->addRule('$updatedAt', [
                'type' => self::TYPE_DATETIME,
                'description' => 'Execution upate date in Datetime',
                'default' => '',
                'example' => '1975-12-06 13:30:59',
            ])
            ->addRule('$permissions', [
                'type' => self::TYPE_STRING,
                'description' => 'Execution roles.',
                'default' => '',
                'example' => ['any'],
                'array' => true,
            ])
            ->addRule('functionId', [
                'type' => self::TYPE_STRING,
                'description' => 'Function ID.',
                'default' => '',
                'example' => '5e5ea6g16897e',
            ])
            ->addRule('trigger', [
                'type' => self::TYPE_STRING,
                'description' => 'The trigger that caused the function to execute. Possible values can be: `http`, `schedule`, or `event`.',
                'default' => '',
                'example' => 'http',
            ])
            ->addRule('status', [
                'type' => self::TYPE_STRING,
                'description' => 'The status of the function execution. Possible values can be: `waiting`, `processing`, `completed`, or `failed`.',
                'default' => '',
                'example' => 'processing',
            ])
            ->addRule('statusCode', [
                'type' => self::TYPE_INTEGER,
                'description' => 'The script status code.',
                'default' => 0,
                'example' => 0,
            ])
            ->addRule('response', [
                'type' => self::TYPE_STRING,
                'description' => 'The script response output string. Logs the last 4,000 characters of the execution response output.',
                'default' => '',
                'example' => '',
            ])
            ->addRule('stderr', [
                'type' => self::TYPE_STRING,
                'description' => 'The script stderr output string. Logs the last 4,000 characters of the execution stderr output',
                'default' => '',
                'example' => '',
            ])
            ->addRule('time', [
                'type' => self::TYPE_FLOAT,
                'description' => 'The script execution time in seconds.',
                'default' => 0,
                'example' => 0.400,
            ])
        ;
    }

    /**
     * Get Name
     *
     * @return string
     */
    public function getName(): string
    {
        return 'Execution';
    }

    /**
     * Get Type
     *
     * @return string
     */
    public function getType(): string
    {
        return Response::MODEL_EXECUTION;
    }
}
