import type { CategoryMeta, Question } from "../questions";
import type { Topic, Term } from "../glossary";
import type { QuizQuestion, QuizSection } from "../quizzes";

/* ============== CATEGORIES ============== */

export const JAVA_CATEGORIES: CategoryMeta[] = [
  { id: "collections", name: "Collections", emoji: "📚", blurb: "List, Set, Map — pick the right one", color: "primary", track: "java-dev" },
  { id: "concurrency", name: "Concurrency", emoji: "🧵", blurb: "Threads, Executors, locks", color: "accent", track: "java-dev" },
  { id: "streams", name: "Streams API", emoji: "🌊", blurb: "map / filter / reduce", color: "secondary", track: "java-dev" },
  { id: "spring-boot", name: "Spring Boot", emoji: "🌱", blurb: "DI, controllers, JPA", color: "primary", track: "java-dev" },
  { id: "jvm", name: "JVM", emoji: "⚙️", blurb: "GC, memory, classloading", color: "accent", track: "java-dev" },
];

const T = (offset = 0) => {
  const base = new Date(2024, 0, 1, 10, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const okRow = (n: string, s: string) => ({ number: n, state: s, updated: "now", highlight: "ok" as const });
const badRow = (n: string, s: string) => ({ number: n, state: s, updated: "now", highlight: "bad" as const });

export const JAVA_QUESTIONS: Question[] = [
  // ----- Collections -----
  {
    id: "j-col-1",
    category: "collections",
    level: 1,
    filename: "Cache.java",
    title: "Pick the right Map for an insertion-ordered cache.",
    code: [
      "Map<String, User> cache = {{SLOT}}",
      "cache.put(\"alice\", a);",
      "cache.put(\"bob\", b);",
      "cache.put(\"carol\", c);",
      "// Iterate must yield alice → bob → carol",
    ],
    options: [
      {
        id: "a",
        text: "new LinkedHashMap<>();",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "new HashMap<>();",
        correct: false,
        feedback: {
          title: "HashMap iteration is unspecified",
          explain: "HashMap gives O(1) get/put but iteration order can change with resizes. For insertion order, use LinkedHashMap.",
          sim: { rows: [okRow("Iter 1", "carol"), okRow("Iter 2", "alice"), okRow("Iter 3", "bob")], logs: [{ time: T(), text: "Iteration order: carol, alice, bob (unstable)", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "new TreeMap<>();",
        correct: false,
        feedback: {
          title: "Sorted, not insertion-ordered",
          explain: "TreeMap is alphabetic / Comparator order, not insertion order.",
          sim: { rows: [okRow("Iter 1", "alice"), okRow("Iter 2", "bob"), okRow("Iter 3", "carol")], logs: [{ time: T(), text: "Order happens to look right but it's sorted, not insertion", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "java.util.LinkedHashMap",
      rows: [okRow("Iter 1", "alice"), okRow("Iter 2", "bob"), okRow("Iter 3", "carol")],
      logs: [{ time: T(), text: "Iteration in insertion order — guaranteed", tone: "ok" }],
    },
    correctTeach: {
      title: "Map flavors at a glance",
      explain: "HashMap = O(1) unordered. LinkedHashMap = insertion or access order. TreeMap = sorted by key. ConcurrentHashMap = thread-safe (no whole-map locks).",
    },
  },
  {
    id: "j-col-2",
    category: "collections",
    level: 1,
    filename: "Dedupe.java",
    title: "Dedupe a list, preserving first-seen order.",
    code: [
      "List<String> in = List.of(\"a\",\"b\",\"a\",\"c\",\"b\");",
      "Collection<String> out = {{SLOT}}",
      "// Expected: [a, b, c]",
    ],
    options: [
      {
        id: "a",
        text: "new LinkedHashSet<>(in);",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "new HashSet<>(in);",
        correct: false,
        feedback: {
          title: "Loses order",
          explain: "HashSet dedupes but iteration order isn't insertion order.",
          sim: { rows: [okRow("[0]", "c"), okRow("[1]", "a"), okRow("[2]", "b")], logs: [{ time: T(), text: "Output: [c, a, b]", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "new TreeSet<>(in);",
        correct: false,
        feedback: {
          title: "Sorted order",
          explain: "TreeSet sorts naturally — [a, b, c] here by accident, but only because the input is letters.",
          sim: { rows: [okRow("[0]", "a"), okRow("[1]", "b"), okRow("[2]", "c")], logs: [{ time: T(), text: "Sorted output — not 'first-seen' guarantee", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "java.util.LinkedHashSet",
      rows: [okRow("[0]", "a"), okRow("[1]", "b"), okRow("[2]", "c")],
      logs: [{ time: T(), text: "Dedup + insertion order preserved", tone: "ok" }],
    },
    correctTeach: {
      title: "LinkedHashSet pattern",
      explain: "Whenever you need 'unique + first-seen order' in one line, `new LinkedHashSet<>(list)` is the idiom.",
    },
  },

  // ----- Concurrency -----
  {
    id: "j-con-1",
    category: "concurrency",
    level: 2,
    filename: "Counter.java",
    title: "Thread-safe counter with maximum throughput.",
    code: [
      "// Hit from 64 threads, ~10M times/sec",
      "{{SLOT}}",
      "int v = counter.incrementAndGet();",
    ],
    options: [
      {
        id: "a",
        text: "AtomicInteger counter = new AtomicInteger();",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "int counter = 0; synchronized(this) { counter++; }",
        correct: false,
        feedback: {
          title: "Slow & error-prone",
          explain: "Synchronized blocks serialize all threads — orders of magnitude slower than CAS-based AtomicInteger under contention.",
          sim: { rows: [badRow("RPS", "120,000")], logs: [{ time: T(), text: "Throughput collapses under contention", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "volatile int counter = 0;",
        correct: false,
        feedback: {
          title: "Visibility ≠ atomicity",
          explain: "`volatile` only fixes visibility. `counter++` is read-modify-write — still loses updates.",
          sim: { rows: [badRow("Lost updates", "~38%")], logs: [{ time: T(), text: "Increments lost under concurrent writes", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "java.util.concurrent.atomic",
      rows: [okRow("RPS", "9,800,000"), okRow("Lost updates", "0")],
      logs: [{ time: T(), text: "CAS loop: lock-free, correct, fast", tone: "ok" }],
    },
    correctTeach: {
      title: "Atomic* vs synchronized vs volatile",
      explain: "volatile fixes visibility. synchronized gives atomicity but blocks. Atomic* uses CPU CAS — best of both for single-variable updates. For more variables, use LongAdder (even faster under high contention) or a real lock.",
    },
  },
  {
    id: "j-con-2",
    category: "concurrency",
    level: 2,
    filename: "Server.java",
    title: "Run 100 HTTP calls in parallel with a bounded pool.",
    code: [
      "ExecutorService pool = {{SLOT}}",
      "List<Future<Resp>> futures = urls.stream()",
      "  .map(u -> pool.submit(() -> http.get(u)))",
      "  .toList();",
    ],
    options: [
      {
        id: "a",
        text: "Executors.newFixedThreadPool(16);",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Executors.newCachedThreadPool();",
        correct: false,
        feedback: {
          title: "Unbounded → OOM risk",
          explain: "Cached pool creates threads as needed with no upper bound. 100 IO calls might spawn 100 OS threads. Use a fixed pool sized for your workload.",
          sim: { rows: [badRow("Threads", "100"), badRow("Heap", "OutOfMemory")], logs: [{ time: T(), text: "Thread explosion → OOM", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Executors.newSingleThreadExecutor();",
        correct: false,
        feedback: {
          title: "Serial — defeats parallelism",
          explain: "Single thread runs calls one after the other. 100×100ms = 10s instead of ~700ms.",
          sim: { rows: [badRow("Latency", "10.1s")], logs: [{ time: T(), text: "All 100 calls serialized", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "ThreadPoolExecutor",
      rows: [okRow("Threads", "16"), okRow("p95 latency", "780ms")],
      logs: [{ time: T(), text: "16 workers, queue absorbs the rest", tone: "ok" }],
    },
    correctTeach: {
      title: "Pick pool size by workload",
      explain: "CPU-bound ≈ #cores. IO-bound ≈ much higher (workers spend time waiting). On Java 21+, prefer virtual threads (`Executors.newVirtualThreadPerTaskExecutor()`) for IO-heavy workloads.",
    },
  },

  // ----- Streams -----
  {
    id: "j-str-1",
    category: "streams",
    level: 1,
    filename: "TopBuyers.java",
    title: "Group orders by customer, sum amounts, top 3.",
    code: [
      "Map<String, Double> top = orders.stream()",
      "  .collect(Collectors.groupingBy(Order::customer,",
      "      Collectors.summingDouble(Order::amount)))",
      "  .entrySet().stream()",
      "  {{SLOT}}",
      "  .limit(3)",
      "  .collect(Collectors.toMap(Entry::getKey, Entry::getValue,",
      "      (a,b)->a, LinkedHashMap::new));",
    ],
    options: [
      {
        id: "a",
        text: ".sorted(Map.Entry.<String,Double>comparingByValue().reversed())",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: ".sorted(Map.Entry.comparingByValue())",
        correct: false,
        feedback: {
          title: "Ascending — gives bottom 3",
          explain: "Forgot `.reversed()`. Top-N requires descending sort.",
          sim: { rows: [okRow("#1", "alice $5"), okRow("#2", "bob $12"), okRow("#3", "carol $40")], logs: [{ time: T(), text: "Returned smallest customers", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: ".sorted()",
        correct: false,
        feedback: {
          title: "Won't compile",
          explain: "Map.Entry isn't naturally Comparable; you must pass a comparator.",
          sim: { rows: [], logs: [{ time: T(), text: "compile error: Entry is not Comparable", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "TopBuyers",
      rows: [okRow("#1", "frank $980"), okRow("#2", "dave $640"), okRow("#3", "eve $420")],
      logs: [{ time: T(), text: "Top 3 by total amount", tone: "ok" }],
    },
    correctTeach: {
      title: "groupingBy + downstream collector",
      explain: "groupingBy takes a classifier and an optional downstream collector. Combine with summingDouble / counting / mapping to express SQL-style aggregations in one pass.",
    },
  },
  {
    id: "j-str-2",
    category: "streams",
    level: 2,
    filename: "Parallel.java",
    title: "When does .parallelStream() actually help?",
    code: [
      "long sum = nums.{{SLOT}}",
      "    .mapToLong(this::expensiveScore)",
      "    .sum();",
    ],
    options: [
      {
        id: "a",
        text: "parallelStream()   // nums is large AND expensiveScore is CPU-bound, stateless, side-effect-free",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "parallelStream()   // expensiveScore writes to a shared ArrayList",
        correct: false,
        feedback: {
          title: "Race conditions",
          explain: "Parallel streams require stateless operations. Writing to a shared mutable collection corrupts data and the JVM doesn't warn you.",
          sim: { rows: [badRow("Size", "expected 1M, got 873,201")], logs: [{ time: T(), text: "Lost writes on shared ArrayList", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "parallelStream()   // nums has 10 items, score is a HashMap lookup",
        correct: false,
        feedback: {
          title: "Overhead > benefit",
          explain: "Parallel pays a fork-join setup cost. Tiny streams or cheap operations end up slower than sequential.",
          sim: { rows: [badRow("Parallel ms", "8.4"), okRow("Sequential ms", "0.3")], logs: [{ time: T(), text: "Sequential wins by 25× on small inputs", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "Stream Benchmark",
      rows: [okRow("Sequential ms", "1840"), okRow("Parallel ms", "260")],
      logs: [{ time: T(), text: "7× speedup on 8-core CPU-bound workload", tone: "ok" }],
    },
    correctTeach: {
      title: "Parallel checklist",
      explain: "Large dataset · CPU-bound · stateless · associative reduction · no shared mutable state. Miss any one and parallel is wrong (or worse).",
    },
  },

  // ----- Spring Boot -----
  {
    id: "j-spr-1",
    category: "spring-boot",
    level: 1,
    filename: "UserController.java",
    title: "Inject a UserService into a controller — preferred style.",
    code: [
      "@RestController",
      "public class UserController {",
      "  private final UserService service;",
      "  {{SLOT}}",
      "}",
    ],
    options: [
      {
        id: "a",
        text: "public UserController(UserService service) { this.service = service; }",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "@Autowired private UserService service;",
        correct: false,
        feedback: {
          title: "Field injection is discouraged",
          explain: "Field injection hides dependencies, breaks immutability, and complicates testing. Constructor injection is the modern default — and `@Autowired` isn't needed on a single constructor.",
          sim: { rows: [badRow("Tests", "Need reflection / SpringRunner")], logs: [{ time: T(), text: "Hard to unit-test without Spring context", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "public void setService(UserService s) { this.service = s; }",
        correct: false,
        feedback: {
          title: "Setter injection — optional only",
          explain: "Use setter injection only for truly optional dependencies. Required collaborators belong in the constructor.",
          sim: { rows: [badRow("State", "service can be null at runtime")], logs: [{ time: T(), text: "NPE risk if Spring fails to wire", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "Spring Container",
      rows: [okRow("Bean", "UserController"), okRow("Wired", "UserService")],
      logs: [{ time: T(), text: "Constructor injection: explicit, final, testable", tone: "ok" }],
    },
    correctTeach: {
      title: "Constructor injection wins",
      explain: "Fields can be `final`, dependencies are explicit in the signature, and unit tests just call `new UserController(mock)`. No Spring needed in tests.",
    },
  },
  {
    id: "j-spr-2",
    category: "spring-boot",
    level: 2,
    filename: "OrderService.java",
    title: "Roll back if any line item fails to save.",
    code: [
      "@Service",
      "public class OrderService {",
      "  {{SLOT}}",
      "  public void place(Order o) {",
      "    repo.save(o);",
      "    o.items().forEach(itemRepo::save);  // last save throws",
      "  }",
      "}",
    ],
    options: [
      {
        id: "a",
        text: "@Transactional",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "try { ... } catch(Exception e) { repo.delete(o); }",
        correct: false,
        feedback: {
          title: "Manual rollback = bugs",
          explain: "You'd have to track every partial write and undo it — impossible with cascades or generated IDs. Let the DB transaction roll back atomically.",
          sim: { rows: [badRow("Orphan row", "order #1018 saved, items missing")], logs: [{ time: T(), text: "Partial state left in DB", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "synchronized(this)",
        correct: false,
        feedback: {
          title: "Lock ≠ transaction",
          explain: "synchronized prevents concurrent execution but doesn't undo DB writes when something throws.",
          sim: { rows: [badRow("Orphan row", "order #1018 saved, items missing")], logs: [{ time: T(), text: "Partial state left in DB", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "@Transactional",
      rows: [okRow("Order", "rolled back"), okRow("Items", "rolled back")],
      logs: [{ time: T(), text: "Single transaction — all-or-nothing", tone: "ok" }],
    },
    correctTeach: {
      title: "Transaction propagation defaults to REQUIRED",
      explain: "First @Transactional starts a tx; nested calls join it. Use `propagation = REQUIRES_NEW` only when you need an independent transaction (e.g. audit logs that must persist even if the main op rolls back).",
    },
  },

  // ----- JVM -----
  {
    id: "j-jvm-1",
    category: "jvm",
    level: 2,
    filename: "Heap.java",
    title: "Production GC: app pauses for 3s every 5 minutes. First switch to try?",
    code: [
      "// java -Xmx4g {{SLOT}} -jar app.jar",
    ],
    options: [
      {
        id: "a",
        text: "-XX:+UseG1GC   (or -XX:+UseZGC on Java 17+ for sub-ms pauses)",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "-XX:+UseSerialGC",
        correct: false,
        feedback: {
          title: "Single-threaded GC",
          explain: "Serial GC is for tiny apps. With 4GB heap it pauses for many seconds.",
          sim: { rows: [badRow("p99 pause", "8.2s")], logs: [{ time: T(), text: "Serial GC stop-the-world", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "-Xmx16g   (just give it more heap)",
        correct: false,
        feedback: {
          title: "Bigger heap → bigger pauses",
          explain: "With the wrong collector, more heap means longer stop-the-world. Pick a low-pause GC first, then tune size.",
          sim: { rows: [badRow("p99 pause", "12s")], logs: [{ time: T(), text: "Larger heap, larger pause", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "GC Logs",
      rows: [okRow("p99 pause", "45ms"), okRow("Throughput", "+18%")],
      logs: [{ time: T(), text: "G1 default since Java 9 — concurrent, low pause", tone: "ok" }],
    },
    correctTeach: {
      title: "GC quick map",
      explain: "G1 = default, good general purpose. ZGC / Shenandoah = sub-ms pauses on very large heaps (Java 17+). Parallel = max throughput, longer pauses. Always enable GC logging in production (`-Xlog:gc*:file=gc.log`).",
    },
  },
  {
    id: "j-jvm-2",
    category: "jvm",
    level: 2,
    filename: "OOM.txt",
    title: "OutOfMemoryError: Metaspace — most common cause?",
    code: [
      "// java.lang.OutOfMemoryError: Metaspace",
      "// First suspect:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Classloader leak — dynamic class generation (proxies, scripting, hot redeploys) without releasing classloaders",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Too many objects on the heap",
        correct: false,
        feedback: {
          title: "Wrong OOM",
          explain: "That would say `Java heap space`. Metaspace stores class metadata, not objects.",
          sim: { rows: [], logs: [{ time: T(), text: "Heap is fine — wrong region targeted", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "Heap fragmentation",
        correct: false,
        feedback: {
          title: "Different problem",
          explain: "Fragmentation causes heap allocation failures, not metaspace exhaustion.",
          sim: { rows: [], logs: [{ time: T(), text: "Metaspace usage continues to grow", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "Metaspace",
      rows: [okRow("Classes loaded", "12,400 (stable)"), okRow("Classloaders", "8 (stable)")],
      logs: [{ time: T(), text: "After fixing classloader leak, metaspace plateaus", tone: "ok" }],
    },
    correctTeach: {
      title: "Metaspace lives outside the heap",
      explain: "Capped by `-XX:MaxMetaspaceSize`. Constant growth = class metadata never freed → almost always a classloader leak (often from hot-reloading frameworks, byte-code generators, or app servers). Take a heap dump and look at classloader instances.",
    },
  },
];

/* ============== TOPICS ============== */

export const JAVA_TOPICS: Topic[] = [
  { id: "java-core", name: "Core Java", tagline: "Language, types, generics.", emoji: "☕", blurb: "The non-negotiable basics: primitives vs wrappers, equals/hashCode, generics & bounded types, exceptions, var.", track: "java-dev" },
  { id: "java-collections", name: "Collections", tagline: "List, Set, Map — and when to use which.", emoji: "📚", blurb: "The collections framework: List/Set/Map/Queue hierarchies, performance characteristics, iteration order, concurrent variants.", track: "java-dev" },
  { id: "java-concurrency", name: "Concurrency", tagline: "Threads, executors, locks, virtual threads.", emoji: "🧵", blurb: "From `synchronized` to ExecutorService, CompletableFuture, locks, atomics, and Java 21 virtual threads.", track: "java-dev" },
  { id: "java-spring", name: "Spring & DI", tagline: "Beans, profiles, web, data.", emoji: "🌱", blurb: "Spring Boot fundamentals: dependency injection, auto-configuration, MVC, transactions, profiles.", track: "java-dev" },
];

export const JAVA_TERMS: Term[] = [
  { topic: "java-core", term: "Autoboxing", short: "Implicit conversion between primitive & wrapper.", long: "`int → Integer` (boxing), `Integer → int` (unboxing). Beware NullPointerException on unboxing a null Integer." },
  { topic: "java-core", term: "equals / hashCode contract", short: "Equal objects must have equal hash codes.", long: "Break this and HashMap/HashSet quietly misbehave. Always override both together; use IDE / records." },
  { topic: "java-core", term: "Record", short: "Immutable data carrier (Java 16+).", long: "`record Point(int x, int y) {}` generates constructor, accessors, equals, hashCode, toString. Cannot extend other classes." },
  { topic: "java-core", term: "Sealed class", short: "Restricts who can extend a type (Java 17+).", long: "`sealed interface Shape permits Circle, Square` enables exhaustive `switch` and a closed hierarchy." },

  { topic: "java-collections", term: "ArrayList vs LinkedList", short: "Pick ArrayList. Almost always.", long: "ArrayList: O(1) random access, cache-friendly. LinkedList: O(n) access, lots of object overhead. LinkedList rarely wins in practice." },
  { topic: "java-collections", term: "HashMap", short: "O(1) average get/put, unordered.", long: "Backed by hash table with treeified buckets on collisions (since Java 8). Not thread-safe." },
  { topic: "java-collections", term: "ConcurrentHashMap", short: "Thread-safe hash map, lock-striped.", long: "Concurrent reads, fine-grained write locks. Use atomic methods `computeIfAbsent`, `merge` to avoid races." },
  { topic: "java-collections", term: "TreeMap", short: "Sorted by key (red-black tree).", long: "O(log n) operations; useful for range queries (`subMap`, `firstKey`, `floorKey`)." },

  { topic: "java-concurrency", term: "volatile", short: "Visibility, not atomicity.", long: "Reads/writes go through main memory across threads. Doesn't make `x++` atomic. Use Atomic* for that." },
  { topic: "java-concurrency", term: "ExecutorService", short: "Thread pool abstraction.", long: "Submit Callable/Runnable, get Future. Always shut down (`shutdown()` / `awaitTermination`) — non-daemon pool threads keep the JVM alive." },
  { topic: "java-concurrency", term: "CompletableFuture", short: "Composable async pipelines.", long: "`supplyAsync`, `thenApply`, `thenCompose`, `allOf`. Replaces nested callbacks for async work." },
  { topic: "java-concurrency", term: "Virtual Thread", short: "Lightweight thread (Java 21+).", long: "Project Loom: millions of threads cheap to create. Great for blocking IO. Don't pool them — start one per task." },

  { topic: "java-spring", term: "@Component / @Service / @Repository", short: "Bean stereotypes.", long: "Functionally similar; semantic intent differs. @Repository also adds Spring data-access exception translation." },
  { topic: "java-spring", term: "@Transactional", short: "Wraps a method in a DB transaction.", long: "Defaults: rollback on RuntimeException, propagation=REQUIRED. Only works on public methods called from outside the class (proxy)." },
  { topic: "java-spring", term: "Profile", short: "Conditional bean activation.", long: "Annotate beans with @Profile(\"dev\"); activate with `spring.profiles.active=dev`. Used for env-specific config." },
  { topic: "java-spring", term: "Application Properties", short: "Key/value config.", long: "Lives in application.yml or .properties. Override via env vars (`SPRING_DATASOURCE_URL`) or `--spring.config.location`." },
];

/* ============== QUIZZES ============== */

export const JAVA_QUIZZES: QuizQuestion[] = [
  // java-core
  { id: "j-c1", topic: "java-core", question: "What does `var` infer?", options: ["Runtime type", "Compile-time type from initializer", "Always Object", "Generics wildcard"], correctIndex: 1, explain: "`var x = 1;` infers int at compile time. Still strongly typed." },
  { id: "j-c2", topic: "java-core", question: "Which is true about records?", options: ["They can extend any class", "They're implicitly final, fields are private final", "Mutable by default", "Can't implement interfaces"], correctIndex: 1, explain: "Records are final, components are final, equals/hashCode/toString auto-generated. They can implement interfaces." },
  { id: "j-c3", topic: "java-core", question: "Override equals() but forget hashCode(). Storing in a HashSet…", options: ["Works fine", "Duplicates can appear; lookups fail", "Compile error", "OutOfMemory"], correctIndex: 1, explain: "HashSet uses hashCode to find the bucket. Equal objects in different buckets → both stored, lookup miss." },
  { id: "j-c4", topic: "java-core", question: "`Integer a = 128; Integer b = 128; a == b` returns…", options: ["true", "false (outside cache)", "compile error", "NPE"], correctIndex: 1, explain: "Integer cache covers -128..127 only. Above that, autoboxing creates new objects; `==` compares references." },
  { id: "j-c5", topic: "java-core", question: "Best way to handle a checked exception you can't recover from?", options: ["Swallow it silently", "Wrap in RuntimeException with cause", "Log and continue", "Catch and ignore in production"], correctIndex: 1, explain: "Wrap to preserve the stack trace while letting it bubble. Never swallow." },
  { id: "j-c6", topic: "java-core", question: "Sealed interfaces help most with…", options: ["Performance", "Exhaustive pattern matching in switch", "Memory layout", "Garbage collection"], correctIndex: 1, explain: "Closed hierarchies let the compiler verify your switch covers all cases (Java 21 switch expressions on sealed types)." },

  // java-collections
  { id: "j-co1", topic: "java-collections", question: "Best Map for thread-safe high-concurrency reads & writes:", options: ["HashMap", "Hashtable", "ConcurrentHashMap", "TreeMap"], correctIndex: 2, explain: "ConcurrentHashMap is lock-striped — concurrent reads, fine-grained writes. Hashtable locks the whole map." },
  { id: "j-co2", topic: "java-collections", question: "List.of(...) returns a list that is…", options: ["Mutable", "Immutable", "Thread-safe mutable", "Linked"], correctIndex: 1, explain: "Returns an unmodifiable list (Java 9+). Calling add throws UnsupportedOperationException." },
  { id: "j-co3", topic: "java-collections", question: "Insertion-ordered Set?", options: ["HashSet", "TreeSet", "LinkedHashSet", "ConcurrentSkipListSet"], correctIndex: 2, explain: "LinkedHashSet keeps elements in insertion order." },
  { id: "j-co4", topic: "java-collections", question: "ArrayList.remove(int index) is O(?)", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], correctIndex: 2, explain: "Shifts every later element by one. Removing from the end is O(1)." },
  { id: "j-co5", topic: "java-collections", question: "PriorityQueue gives you…", options: ["FIFO order", "Natural-order (or comparator) head retrieval", "LIFO order", "Random order"], correctIndex: 1, explain: "Heap-based — poll() returns the smallest (or comparator-min) element in O(log n)." },
  { id: "j-co6", topic: "java-collections", question: "Stream.collect(Collectors.toUnmodifiableMap(...)) throws on…", options: ["Empty stream", "Duplicate keys", "Null values", "Both B and C"], correctIndex: 3, explain: "Both duplicate keys (no merge function) and null values throw." },

  // java-concurrency
  { id: "j-cc1", topic: "java-concurrency", question: "synchronized provides…", options: ["Atomicity & visibility", "Visibility only", "Performance", "Garbage collection"], correctIndex: 0, explain: "Enters monitor (mutual exclusion) + memory barriers (visibility)." },
  { id: "j-cc2", topic: "java-concurrency", question: "Best for a shared counter under high contention?", options: ["volatile int", "AtomicInteger", "LongAdder", "synchronized int"], correctIndex: 2, explain: "LongAdder maintains per-thread cells, summed on read. Beats AtomicInteger under heavy contention." },
  { id: "j-cc3", topic: "java-concurrency", question: "CompletableFuture.thenApplyAsync(fn) runs fn on…", options: ["Calling thread", "ForkJoinPool.commonPool by default", "A new thread per call", "The Executor passed to supplyAsync"], correctIndex: 1, explain: "Async variants default to commonPool unless you pass an Executor." },
  { id: "j-cc4", topic: "java-concurrency", question: "Virtual threads are best for…", options: ["CPU-bound work", "Blocking IO at scale", "GPU work", "Native code"], correctIndex: 1, explain: "Cheap to block — perfect for thousands of concurrent IO calls. CPU-bound work still uses platform threads." },
  { id: "j-cc5", topic: "java-concurrency", question: "Failing to shutdown() a non-daemon ExecutorService causes…", options: ["Memory leak only", "JVM keeps running after main returns", "Compile error", "Deadlock"], correctIndex: 1, explain: "Pool threads are non-daemon by default and keep the JVM alive." },
  { id: "j-cc6", topic: "java-concurrency", question: "ReentrantReadWriteLock is best when…", options: ["Reads dominate writes", "Writes dominate reads", "Equal mix", "Single-threaded"], correctIndex: 0, explain: "Multiple readers can hold the lock concurrently; writes block. Wins when reads vastly outnumber writes." },

  // java-spring
  { id: "j-sp1", topic: "java-spring", question: "Constructor injection is preferred because…", options: ["Faster startup", "Dependencies are final and explicit", "Spring requires it", "It's the only option"], correctIndex: 1, explain: "Final fields, explicit signature, trivially testable without Spring." },
  { id: "j-sp2", topic: "java-spring", question: "@Transactional doesn't roll back on which by default?", options: ["RuntimeException", "Error", "Checked Exception", "Unchecked Exception"], correctIndex: 2, explain: "Checked exceptions don't trigger rollback unless you set `rollbackFor`." },
  { id: "j-sp3", topic: "java-spring", question: "What activates a Spring Profile?", options: ["@ActiveProfile annotation", "spring.profiles.active env/property", "Component scan", "@Bean(profile)"], correctIndex: 1, explain: "Set via env var, JVM property, or in application.yml." },
  { id: "j-sp4", topic: "java-spring", question: "@RestController vs @Controller:", options: ["@RestController adds @ResponseBody to every method", "Same thing", "@Controller is deprecated", "@RestController is for SOAP"], correctIndex: 0, explain: "@RestController = @Controller + @ResponseBody — return values are serialized (JSON) instead of resolved as view names." },
  { id: "j-sp5", topic: "java-spring", question: "Spring Boot auto-configuration is driven by…", options: ["XML files", "Classpath conditions (@ConditionalOnClass)", "Database schema", "Annotations on main"], correctIndex: 1, explain: "Auto-config classes use @Conditional* to apply only when relevant classes/properties exist." },
  { id: "j-sp6", topic: "java-spring", question: "@Transactional on a private method works because…", options: ["It does — Spring weaves all methods", "It doesn't — proxy-based AOP only intercepts public methods called from outside", "Compile error", "Only with @EnableLoadTimeWeaving"], correctIndex: 1, explain: "JDK / CGLIB proxies can't intercept self-invocations or non-public methods." },
];

export const JAVA_SECTIONS: Record<string, QuizSection[]> = {
  "java-core": [
    { label: "Language", icon: "☕", count: 3 },
    { label: "Modern features", icon: "✨", count: 3 },
  ],
  "java-collections": [
    { label: "Lists & Maps", icon: "📚", count: 3 },
    { label: "Performance", icon: "⚡", count: 3 },
  ],
  "java-concurrency": [
    { label: "Primitives", icon: "🧵", count: 3 },
    { label: "Executors & Futures", icon: "🚀", count: 3 },
  ],
  "java-spring": [
    { label: "DI & beans", icon: "🌱", count: 3 },
    { label: "Web & data", icon: "🌐", count: 3 },
  ],
};
