<?php
declare(strict_types=1);

namespace MyApp\Models;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}

trait Timestampable {
    protected \DateTime $createdAt;
    protected \DateTime $updatedAt;
}

enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
}

class User implements PaymentInterface {
    use Timestampable;
    
    private string $name;
    
    public function __construct(string $name) {
        $this->name = $name;
    }
    
    public function getName(): string {
        return $this->name;
    }
    
    public function processPayment(float $amount): bool {
        return true;
    }
}

class Product {
    private string $name;
    private float $price;
    
    public function __construct(string $name, float $price) {
        $this->name = $name;
        $this->price = $price;
    }
    
    public function getFormattedTags(): array {
        return array_map(fn($tag) => strtoupper($tag), ['tag1', 'tag2']);
    }
    
    public function getCategory(): string {
        return match($this->price) {
            0.0 => 'free',
            default => 'paid',
        };
    }
}

abstract class Vehicle {
    abstract public function getType(): string;
}

class Article {
    public function __construct(
        private string $title,
        private string $content
    ) {}
}

function greet(string $name): string {
    return "Hello, $name!";
}

function add(int $a, int $b): int {
    return $a + $b;
}

function generateNumbers(): \Iterator {
    yield 1;
    yield 2;
    yield 3;
}

$name = "John";
$number = 42;
$fruits = ['apple', 'banana'];
$user = new User("Test User");

$result = match($number) {
    0 => 'zero',
    1, 2, 3 => 'small',
    default => 'large',
};

try {
    throw new \Exception("Test exception");
} catch (\Exception $e) {
    echo $e->getMessage();
} finally {
    echo "Done";
}