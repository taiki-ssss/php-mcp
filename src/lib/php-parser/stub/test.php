<?php
declare(strict_types=1);

// Namespace and use statements
namespace MyApp\Models;

use Exception;
use InvalidArgumentException;
use Iterator;
use JsonSerializable;
use RuntimeException;
use Throwable;

// Interface
interface PaymentInterface {
    public function processPayment(float $amount): bool;
    public function getTransactionId(): ?string;
}

// Trait
trait Timestampable {
    private \DateTime $createdAt;
    private ?\DateTime $updatedAt = null;

    public function setCreatedAt(\DateTime $createdAt): void {
        $this->createdAt = $createdAt;
    }

    public function getCreatedAt(): \DateTime {
        return $this->createdAt;
    }

    public function setUpdatedAt(?\DateTime $updatedAt): void {
        $this->updatedAt = $updatedAt;
    }

    public function getUpdatedAt(): ?\DateTime {
        return $this->updatedAt;
    }
}

// Enum
enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case PENDING = 'pending';
    case DELETED = 'deleted';
}

// Abstract class
abstract class Vehicle {
    protected string $brand;
    protected int $year;
    
    abstract public function getType(): string;
    abstract protected function calculateSpeed(): float;
    
    public function getInfo(): string {
        return "{$this->brand} ({$this->year})";
    }
}

// Regular class with various features
class User implements PaymentInterface, JsonSerializable {
    use Timestampable;
    
    private int $id;
    private string $name;
    private ?string $email;
    private readonly Status $status;
    private static int $totalUsers = 0;
    
    public function __construct(
        int $id,
        string $name,
        ?string $email = null,
        Status $status = Status::ACTIVE
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->status = $status;
        self::$totalUsers++;
    }
    
    public function getName(): string {
        return $this->name;
    }
    
    public function getEmail(): ?string {
        return $this->email;
    }
    
    public function processPayment(float $amount): bool {
        // Payment processing logic
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }
        
        try {
            // Simulate payment processing
            $success = random_int(0, 10) > 2;
            
            if (!$success) {
                throw new RuntimeException('Payment failed');
            }
            
            return true;
        } catch (RuntimeException $e) {
            // Log error
            error_log($e->getMessage());
            return false;
        } finally {
            // Always log attempt
            error_log("Payment attempt for user {$this->id}: $amount");
        }
    }
    
    public function getTransactionId(): ?string {
        return uniqid('txn_', true);
    }
    
    public function jsonSerialize(): mixed {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status->value,
        ];
    }
    
    public static function getTotalUsers(): int {
        return self::$totalUsers;
    }
}

// Class with modern PHP features
class Product {
    private int $id;
    private string $name;
    private float $price;
    private array $tags = [];
    
    public function __construct(
        int $id,
        string $name,
        float $price,
        array $tags = []
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->price = $price;
        $this->tags = $tags;
    }
    
    // Arrow function usage
    public function getFormattedTags(): array {
        return array_map(fn($tag) => strtoupper($tag), $this->tags);
    }
    
    // Match expression
    public function getCategory(): string {
        return match($this->price) {
            0.0 => 'free',
            0.01, 9.99 => 'cheap',
            10.0, 99.99 => 'moderate',
            default => 'expensive',
        };
    }
    
    // Null coalescing operator
    public function getFirstTag(): string {
        return $this->tags[0] ?? 'untagged';
    }
}

// Functions
function greet(string $name): string {
    return "Hello, $name!";
}

function add(int|float $a, int|float $b): int|float {
    return $a + $b;
}

// Generator function
function generateNumbers(int $start, int $end): Iterator {
    for ($i = $start; $i <= $end; $i++) {
        yield $i;
    }
}

// Anonymous function
$multiply = function(int $x, int $y): int {
    return $x * $y;
};

// Arrow function
$divide = fn(float $x, float $y) => $y !== 0.0 ? $x / $y : null;

// Global code
$name = "John Doe";
$number = 42;
$fruits = ['apple', 'banana', 'orange'];

// Control structures
if ($number > 40) {
    echo greet($name);
} elseif ($number > 20) {
    echo "Number is moderate";
} else {
    echo "Number is small";
}

// Match expression
$result = match($number) {
    0 => 'zero',
    1, 2, 3 => 'small',
    // 4...10 => 'medium', // Range operator not yet supported
    default => 'large',
};

// Loops
foreach ($fruits as $index => $fruit) {
    echo "$index: $fruit\n";
}

for ($i = 0; $i < 5; $i++) {
    if ($i === 2) continue;
    if ($i === 4) break;
    echo $i;
}

while (count($fruits) > 0) {
    $fruit = array_pop($fruits);
    echo $fruit;
}

do {
    $randomNumber = random_int(1, 10);
} while ($randomNumber < 5);

// Try-catch with modern features
try {
    $user = new User(1, "John Doe", "john@example.com");
    $payment = $user->processPayment(100.50);
    
    if (!$payment) {
        throw new Exception("Payment processing failed");
    }
} catch (InvalidArgumentException $e) {
    echo "Invalid argument: " . $e->getMessage();
} catch (RuntimeException | Exception $e) {
    echo "Error: " . $e->getMessage();
} finally {
    echo "Transaction completed";
}

// Switch statement
switch ($result) {
    case 'zero':
        echo "It's zero";
        break;
    case 'small':
    case 'medium':
        echo "It's small or medium";
        break;
    default:
        echo "It's something else";
}

// Null coalescing assignment
$config = [];
$config['debug'] ??= false;
$config['timezone'] ??= 'UTC';

// Array destructuring
[$first, $second, $third] = ['a', 'b', 'c'];
['name' => $userName, 'age' => $userAge] = ['name' => 'Alice', 'age' => 30];

// Variadic functions
function sum(...$numbers): int {
    return array_sum($numbers);
}

// Named arguments usage
$article = new Article(
    title: "PHP 8 Features",
    content: "Modern PHP features explained",
    author: "Jane Doe",
    publishedAt: new \DateTime()
);

// Class with constructor property promotion
class Article {
    public function __construct(
        private string $title,
        private string $content,
        private string $author,
        private \DateTime $publishedAt,
        private ?string $category = null
    ) {}
    
    public function getTitle(): string {
        return $this->title;
    }
    
    public function getSlug(): string {
        return strtolower(str_replace(' ', '-', $this->title));
    }
}

// Anonymous class
$logger = new class {
    public function log(string $message): void {
        echo "[LOG] $message\n";
    }
};

$logger->log("Testing anonymous class");

// Heredoc and Nowdoc
$heredoc = <<<EOT
This is a heredoc string.
It can contain variables like $name.
And span multiple lines.
EOT;

$nowdoc = <<<'EOT'
This is a nowdoc string.
Variables like $name are not interpolated.
It also spans multiple lines.
EOT;

// Complex expressions
$complexExpression = ($number > 40 ? 'high' : 'low') . ' value';
$ternaryChain = $number > 50 ? 'very high' : ($number > 30 ? 'high' : 'low');

// Bitwise operations
$bitwiseAnd = 5 & 3;
$bitwiseOr = 5 | 3;
$bitwiseXor = 5 ^ 3;
$bitwiseNot = ~5;
$leftShift = 5 << 2;
$rightShift = 20 >> 2;

// Type casting
$stringNumber = "123";
$intNumber = (int) $stringNumber;
$floatNumber = (float) $stringNumber;
$boolValue = (bool) $stringNumber;
$arrayValue = (array) $stringNumber;

// Error suppression
$fileContent = @file_get_contents('non-existent-file.txt');

// Inline HTML (mixed mode)
?>
<h1>PHP and HTML Mixed</h1>
<p>Current number: <?= $number ?></p>
<?php

// Include and require statements
// include 'config.php';
// require_once 'bootstrap.php';

// Goto statement (rarely used)
goto skipSection;
echo "This will be skipped";
skipSection:
echo "Execution continues here";

// Declare statements
declare(ticks=1);

// Exit/die
if (false) {
    exit("Exiting script");
    // or die("Script died");
}

// Magic constants
echo __FILE__ . "\n";
echo __DIR__ . "\n";
echo __LINE__ . "\n";
echo __FUNCTION__ . "\n";
echo __CLASS__ . "\n";
echo __METHOD__ . "\n";
echo __NAMESPACE__ . "\n";

// Complex array operations
$matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

// $flattened = array_merge(...$matrix); // Spread operator in function call
$mapped = array_map(fn($row) => array_sum($row), $matrix);
// $filtered = array_filter($flattened, fn($n) => $n % 2 === 0);

// String interpolation variations
$interpolated = "Hello, $name!";
$complexInterpolation = "User: {$user->getName()}";
$arrayAccess = "First fruit: {$fruits[0]}";

// Callable types
$callableFunction = 'greet';
$callableMethod = [$user, 'getName'];
$callableStatic = [User::class, 'getTotalUsers'];

// Yield from
// function delegateGenerator(): Iterator {
//     yield from generateNumbers(1, 3);
//     yield from generateNumbers(10, 12);
// }

// Clone usage
$userClone = clone $user;

// instanceof checks
if ($user instanceof PaymentInterface) {
    $user->processPayment(50.0);
}

// Static late binding
class Base {
    public static function who() {
        echo __CLASS__;
    }
    
    public static function test() {
        static::who();
    }
}

class Child extends Base {
    public static function who() {
        echo __CLASS__;
    }
}

// Namespace aliases
use MyApp\Models\User as UserModel;
use function MyApp\Models\greet as sayHello;
use const MyApp\Models\CONSTANT_VALUE;

// Group use declarations
use MyApp\Models\{
    Product as ProductModel,
    Article as ArticleModel,
    Status
};

// Attributes (PHP 8+)
#[\Attribute]
class Route {
    public function __construct(
        public string $path,
        public string $method = 'GET'
    ) {}
}

#[Route('/api/users', 'GET')]
class UserController {
    #[Route('/api/users/{id}', 'GET')]
    public function getUser(int $id): ?User {
        return null;
    }
}

// Final usage
final class FinalClass {
    final public function finalMethod(): void {
        echo "This method cannot be overridden";
    }
}

// More modern PHP features
$nullsafeChain = $user?->getEmail()?->getDomain();

// Spaceship operator
$comparison = 5 <=> 3; // Returns 1
$comparison2 = 3 <=> 3; // Returns 0
$comparison3 = 3 <=> 5; // Returns -1

// Constant arrays
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// Return type declarations
function processData(array $data): array|false {
    if (empty($data)) {
        return false;
    }
    return array_map('trim', $data);
}

// Void return type
function logMessage(string $message): void {
    error_log($message);
}

// Never return type (PHP 8.1+)
function alwaysThrows(): never {
    throw new RuntimeException('This function never returns');
}

// Mixed type (PHP 8.0+)
function acceptAnything(mixed $value): mixed {
    return $value;
}

// Union types (PHP 8.0+)
function processValue(int|string|float $value): string {
    return (string) $value;
}

// Intersection types (PHP 8.1+)
interface Stringable {
    public function __toString(): string;
}

function processStringable(Stringable&JsonSerializable $object): string {
    return $object->__toString();
}

// Readonly properties (PHP 8.1+)
class ImmutableData {
    public function __construct(
        public readonly string $id,
        public readonly int $value
    ) {}
}

// First-class callable syntax (PHP 8.1+)
// $fnReference = greet(...);
// $methodReference = $user->getName(...);

// New in initializers (PHP 8.1+)
class Service {
    public function __construct(
        private Logger $logger = new Logger()
    ) {}
}

class Logger {
    public function log(string $message): void {
        echo $message;
    }
}

// Array unpacking with string keys (PHP 8.1+)
$array1 = ['a' => 1, 'b' => 2];
// $array2 = ['c' => 3, ...$array1]; // Array unpacking

// Enums with methods (PHP 8.1+)
enum Color: string {
    case RED = 'red';
    case GREEN = 'green';
    case BLUE = 'blue';
    
    public function getRgb(): array {
        return match($this) {
            self::RED => [255, 0, 0],
            self::GREEN => [0, 255, 0],
            self::BLUE => [0, 0, 255],
        };
    }
}

// DNF types (PHP 8.2+)
interface A {}
interface B {}
interface C {}

// function acceptComplexType((A&B)|C $value): void {
//     // Process value
// }

// Constants in traits (PHP 8.2+)
trait WithConstants {
    public const CONSTANT = 'value';
    final public const FINAL_CONSTANT = 'final_value';
}

// Fetch properties in const expressions (PHP 8.2+)
class Config {
    public const string DEFAULT_TIMEZONE = 'UTC';
    public const array SETTINGS = ['timezone' => self::DEFAULT_TIMEZONE];
}

// Dynamic class constant fetch (PHP 8.2+)
// $constantName = 'DEFAULT_TIMEZONE';
// $timezone = Config::{$constantName};

// readonly classes (PHP 8.2+)
readonly class Point {
    public function __construct(
        public float $x,
        public float $y
    ) {}
}

// Redacted parameters in stack traces (PHP 8.2+)
function processCard(
    #[\SensitiveParameter] string $cardNumber,
    string $holderName
): bool {
    return true;
}

// Exit as expression (PHP 8.3+)
// $result = $condition ? 'success' : exit('error');

// Typed class constants (PHP 8.3+)
class TypedConstants {
    public const string NAME = 'Example';
    public const int VERSION = 1;
    protected const float PI = 3.14159;
    private const bool DEBUG = true;
}

// Override attribute (PHP 8.3+)
class ParentClass {
    public function method(): void {}
}

class ChildClass extends ParentClass {
    #[\Override]
    public function method(): void {}
}

// New json_validate function usage simulation
$jsonString = '{"name": "John", "age": 30}';
if (function_exists('json_validate') && json_validate($jsonString)) {
    $data = json_decode($jsonString);
}

// Property hooks simulation (future PHP)
// class FutureClass {
//     private string $_name;
//     
//     public string $name {
//         get => $this->_name;
//         set => $this->_name = trim($value);
//     }
// }

?>