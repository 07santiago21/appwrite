<?php

namespace Appwrite\Utopia\Response\Model;

use Appwrite\Utopia\Response;
use Appwrite\Utopia\Response\Model;

class Repository extends Model
{
    public function __construct()
    {
        $this
            ->addRule('id', [
                'type' => self::TYPE_STRING,
                'description' => 'Git Repository ID.',
                'default' => '',
                'example' => '5e5ea5c16897e',
            ])
            ->addRule('name', [
                'type' => self::TYPE_STRING,
                'description' => 'Repository Name.',
                'default' => '',
                'example' => 'appwrite',
            ])
            ->addRule('private', [
                'type' => self::TYPE_BOOLEAN,
                'description' => 'Is repository private?',
                'default' => false,
                'example' => true,
            ])
            ->addRule('pushedAt', [
                'type' => self::TYPE_DATETIME,
                'description' => 'Last commit date in ISO 8601 format.',
                'default' => APP_DATABASE_ATTRIBUTE_DATETIME,
                'example' => APP_DATABASE_ATTRIBUTE_DATETIME,
                'array' => false,
            ]);
    }

    /**
     * Get Name
     *
     * @return string
     */
    public function getName(): string
    {
        return 'Repository';
    }

    /**
     * Get Type
     *
     * @return string
     */
    public function getType(): string
    {
        return Response::MODEL_REPOSITORY;
    }
}
