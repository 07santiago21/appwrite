<?php

namespace Appwrite\Utopia\Response\Model;

use Appwrite\Utopia\Response;

class AttributeRelationship extends Attribute
{
    public function __construct()
    {
        parent::__construct();

        $this
            ->addRule('default', [
                'type' => self::TYPE_STRING,
                'description' => 'Default value for attribute when not provided. Only null is optional',
                'default' => null,
                'example' => '',
            ])
            ->addRule('relatedCollection', [
                'type' => self::TYPE_STRING,
                'description' => 'The Id of the related collection',
                'default' => null,
                'example' => 'collection',
            ])
            ->addRule('relationType', [
                'type' => self::TYPE_STRING,
                'description' => 'The type of the relationship ',
                'default' => null,
                'example' => 'oneToOne|oneToMany|manyToOne|manyToMany',
            ])
            ->addRule('twoWay', [
                'type' => self::TYPE_BOOLEAN,
                'description' => 'Is the relationship two-way?',
                'default' => null,
                'example' => 'relationship',
            ])
            ->addRule('twoWayKey', [
                'type' => self::TYPE_STRING,
                'description' => 'The key of the two-way relationship',
                'default' => null,
                'example' => 'string',
            ])
            ->addRule('onDelete', [
                'type' => self::TYPE_STRING,
                'description' => 'Action to take on related documents when parent document is deleted',
                'default' => null,
                'example' => 'restrict|cascade|setNull',
            ])
        ;
    }

    public array $conditions = [
        'type' => self::TYPE_RELATIONSHIP,
    ];

    /**
     * Get Name
     *
     * @return string
     */
    public function getName(): string
    {
        return 'AttributeRelationship';
    }

    /**
     * Get Type
     *
     * @return string
     */
    public function getType(): string
    {
        return Response::MODEL_ATTRIBUTE_RELATIONSHIP;
    }
}
