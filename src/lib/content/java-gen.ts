import type { Category, Question, SimulatorOutput } from "../questions";

/**
 * Programmatic puzzle pool for the Java Developer track.
 * Same shape as the SN Dev / Admin generators.
 */

const COLLECTION_TYPES = [
  { iface: "List", concrete: "ArrayList", ordered: true, dup: true },
  { iface: "List", concrete: "LinkedList", ordered: true, dup: true },
  { iface: "Set", concrete: "HashSet", ordered: false, dup: false },
  { iface: "Set", concrete: "LinkedHashSet", ordered: true, dup: false },
  { iface: "Set", concrete: "TreeSet", ordered: true, dup: false },
  { iface: "Map", concrete: "HashMap", ordered: false, dup: false },
  { iface: "Map", concrete: "LinkedHashMap", ordered: true, dup: false },
  { iface: "Map", concrete: "TreeMap", ordered: true, dup: false },
  { iface: "Queue", concrete: "ArrayDeque", ordered: true, dup: true },
  { iface: "Queue", concrete: "PriorityQueue", ordered: false, dup: true },
] as const;

const PRIMITIVES = ["int", "long", "double", "String", "Integer", "Long", "Double"];
const STREAM_OPS = ["filter", "map", "flatMap", "distinct", "sorted", "limit", "peek"];
const TERMINAL_OPS = ["count", "collect", "reduce", "forEach", "findFirst", "anyMatch", "allMatch"];
const SPRING_ANNOS = [
  { anno: "@RestController", purpose: "expose HTTP endpoints returning JSON" },
  { anno: "@Service", purpose: "mark a business-logic Spring bean" },
  { anno: "@Repository", purpose: "mark a data-access bean with exception translation" },
  { anno: "@Component", purpose: "generic Spring-managed bean" },
  { anno: "@Configuration", purpose: "class declaring @Bean factories" },
  { anno: "@Autowired", purpose: "inject a dependency by type" },
];

function T(offset = 0) {
  const base = new Date(2024, 0, 1, 11, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function makeQ(q: Omit<Question, "options"> & {
  options: Array<{ id: string; text: string; correct: boolean; wrongTitle?: string; wrongExplain?: string; wrongSim?: SimulatorOutput }>;
}): Question {
  return {
    ...q,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      correct: o.correct,
      feedback: o.correct
        ? { title: "", explain: "", sim: { rows: [], logs: [] } }
        : {
            title: o.wrongTitle ?? "Not quite",
            explain: o.wrongExplain ?? "Re-read the snippet — pick the idiomatic Java pattern.",
            sim: o.wrongSim ?? { rows: [], logs: [{ time: T(0), text: "Compilation or runtime mismatch.", tone: "bad" }] },
          },
    })),
  };
}

/* ============ COLLECTIONS ============ */
function collectionsPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // Template A: pick the right collection
  for (let i = 0; i < 18; i++) {
    seq++;
    const wantOrdered = i % 2 === 0;
    const wantUnique = i % 3 === 0;
    const correct = wantUnique
      ? wantOrdered
        ? "LinkedHashSet"
        : "HashSet"
      : wantOrdered
        ? "ArrayList"
        : "ArrayList"; // ArrayList is fine for unordered+dup too
    const wrong1 = wantUnique ? "ArrayList" : "HashSet";
    const wrong2 = correct === "ArrayList" ? "TreeMap" : "ArrayList";
    out.push(makeQ({
      id: `gen-jc-pick-${seq}`,
      category: "collections",
      level: 1 + (i % 3),
      filename: `Collection${seq}.java`,
      title: `Pick a collection that keeps ${wantOrdered ? "insertion order" : "no particular order"} and ${wantUnique ? "rejects duplicates" : "allows duplicates"}.`,
      code: [
        `import java.util.*;`,
        ``,
        `Collection<String> c = new {{SLOT}}<>();`,
        `c.add("a"); c.add("b"); c.add("a");`,
      ],
      options: [
        { id: "a", text: correct, correct: true },
        { id: "b", text: wrong1, correct: false, wrongTitle: `${wrong1} ${wantUnique ? "allows duplicates" : "rejects duplicates"}`, wrongExplain: `Match the contract to the requirement: ${wantUnique ? "Set" : "List"} family for ${wantUnique ? "unique" : "dup-allowed"}.` },
        { id: "c", text: wrong2, correct: false, wrongTitle: `Wrong family`, wrongExplain: "Re-check whether you need a List, Set, or Map." },
      ],
      correctSim: { rows: [{ number: correct, state: wantUnique ? "size=2" : "size=3", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Constructed ${correct}<String>`, tone: "ok" }] },
      correctTeach: { title: "Match contract first, performance second", explain: "List = ordered, dup-allowed. Set = unique. Map = key→value. Within each, pick the impl by ordering/perf needs." },
    }));
  }

  // Template B: HashMap iteration
  for (let i = 0; i < 12; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-jc-iter-${seq}`,
      category: "collections",
      level: 1 + (i % 2),
      filename: `IterMap${seq}.java`,
      title: `Iterate a HashMap<String, Integer> printing both key and value efficiently.`,
      code: [
        `Map<String, Integer> m = ...;`,
        `for ({{SLOT}}) {`,
        `  System.out.println(e.getKey() + "=" + e.getValue());`,
        `}`,
      ],
      options: [
        { id: "a", text: "Map.Entry<String, Integer> e : m.entrySet()", correct: true },
        { id: "b", text: "String k : m.keySet()", correct: false, wrongTitle: "Forces a second lookup per iteration", wrongExplain: "Using `keySet()` then `m.get(k)` is O(2n). `entrySet()` gives you both at once." },
        { id: "c", text: "Integer v : m.values()", correct: false, wrongTitle: "No keys available", wrongExplain: "`values()` loses the key. You need both — iterate `entrySet()`." },
      ],
      correctSim: { rows: [{ number: "entrySet", state: "O(n) single pass", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Iteration printed key=value pairs", tone: "ok" }] },
      correctTeach: { title: "entrySet for key+value iteration", explain: "keySet() + get() is twice the work. entrySet() exposes Map.Entry with both fields in one shot." },
    }));
  }

  // Template C: List.of vs new ArrayList
  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-jc-immutable-${seq}`,
      category: "collections",
      level: 2,
      filename: `Immut${seq}.java`,
      title: `Create a small fixed list that won't be mutated.`,
      code: [
        `List<String> roles = {{SLOT}};`,
      ],
      options: [
        { id: "a", text: 'List.of("user", "admin")', correct: true },
        { id: "b", text: 'Arrays.asList("user", "admin")', correct: false, wrongTitle: "Fixed-size but mutable", wrongExplain: "`Arrays.asList` returns a fixed-size List backed by the array; element writes succeed and `add/remove` throw. Confusing semantics — prefer `List.of()`." },
        { id: "c", text: 'new ArrayList<>(){{ add("user"); add("admin"); }}', correct: false, wrongTitle: "Double-brace init leaks an anonymous subclass", wrongExplain: "Each double-brace creates a new class; holds a reference to the enclosing instance. Don't ship this pattern — use `List.of()`." },
      ],
      correctSim: { rows: [{ number: "ImmutableList", state: "size=2 unmodifiable", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "List.of returned an unmodifiable list", tone: "ok" }] },
      correctTeach: { title: "List.of / Set.of / Map.of for immutable literals", explain: "Java 9+ factories return truly unmodifiable collections — small, thread-safe, and disallow nulls." },
    }));
  }

  return out;
}

/* ============ CONCURRENCY ============ */
function concurrencyPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  for (let i = 0; i < 12; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-cc-atomic-${seq}`,
      category: "concurrency",
      level: 1 + (i % 3),
      filename: `Counter${seq}.java`,
      title: `${10 + i} threads increment a shared counter. Pick a safe, lock-free type.`,
      code: [
        `class Hits {`,
        `  {{SLOT}} count = ...;`,
        `  void hit() { count.incrementAndGet(); }`,
        `}`,
      ],
      options: [
        { id: "a", text: "AtomicLong", correct: true },
        { id: "b", text: "volatile long", correct: false, wrongTitle: "Volatile is visibility, not atomicity", wrongExplain: "`volatile` guarantees reads see the latest write, but `count++` is read-modify-write — still racy under contention." },
        { id: "c", text: "long", correct: false, wrongTitle: "Lost updates", wrongExplain: "Plain `long++` under multi-thread contention loses increments. Use AtomicLong or LongAdder." },
      ],
      correctSim: { rows: [{ number: "AtomicLong", state: `count=${(10 + i) * 1000} (no loss)`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "CAS loop reached final value with no contention loss", tone: "ok" }] },
      correctTeach: { title: "Atomics for hot counters", explain: "Under heavy contention, `LongAdder` scales better than `AtomicLong` because it shards across stripes." },
    }));
  }

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-cc-executor-${seq}`,
      category: "concurrency",
      level: 2,
      filename: `Pool${seq}.java`,
      title: `Run ${100 + i * 10} CPU-bound tasks on a pool sized to cores.`,
      code: [
        `int cores = Runtime.getRuntime().availableProcessors();`,
        `ExecutorService es = {{SLOT}};`,
      ],
      options: [
        { id: "a", text: "Executors.newFixedThreadPool(cores)", correct: true },
        { id: "b", text: "Executors.newCachedThreadPool()", correct: false, wrongTitle: "Unbounded for CPU work", wrongExplain: "Cached pools spawn threads up to Integer.MAX_VALUE. For CPU-bound work this thrashes — use a fixed pool sized to cores." },
        { id: "c", text: "Executors.newSingleThreadExecutor()", correct: false, wrongTitle: "Serial — wastes the other cores", wrongExplain: "A single thread can only do one task at a time. Use fixed pool == cores for CPU-bound." },
      ],
      correctSim: { rows: [{ number: `FixedPool(${4 + (i % 8)})`, state: "throughput optimal", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Pool sized to cores, queue absorbed bursts", tone: "ok" }] },
      correctTeach: { title: "CPU-bound → fixed = cores; IO-bound → larger", explain: "Use `CompletableFuture` + custom Executor for IO-bound to allow more concurrency than cores." },
    }));
  }

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-cc-deadlock-${seq}`,
      category: "concurrency",
      level: 2 + (i % 2),
      filename: `Lock${seq}.java`,
      title: `Two threads acquire locks A then B / B then A. How do you prevent deadlock?`,
      code: [
        `// Thread 1: synchronized(a){ synchronized(b){ ... } }`,
        `// Thread 2: synchronized(b){ synchronized(a){ ... } }`,
        `// Fix: {{SLOT}}`,
      ],
      options: [
        { id: "a", text: "Always acquire locks in a globally-defined order", correct: true },
        { id: "b", text: "Add Thread.sleep before each acquire", correct: false, wrongTitle: "Hides the race, doesn't fix it", wrongExplain: "Sleep adjusts timing — deadlock still happens under load. Order acquisition deterministically." },
        { id: "c", text: "Use higher-priority threads", correct: false, wrongTitle: "Priority is a hint, not a guarantee", wrongExplain: "Thread priority is OS-dependent and won't prevent two threads from holding each other's locks." },
      ],
      correctSim: { rows: [{ number: "Locks", state: "Acquired in order a→b on both threads", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "No deadlock under stress test", tone: "ok" }] },
      correctTeach: { title: "Lock ordering is the canonical fix", explain: "Define a total order over your locks (e.g. by identity hashCode) and always acquire in that order. Or use `tryLock` with timeout to break cycles." },
    }));
  }

  return out;
}

/* ============ STREAMS ============ */
function streamsPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  STREAM_OPS.forEach((op, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-st-${op}-${seq}`,
        category: "streams",
        level: 1 + ((i + k) % 3),
        filename: `${op}_${seq}.java`,
        title: `Use the right stream op to ${op === "filter" ? "drop nulls" : op === "map" ? "convert User → String name" : op === "distinct" ? "remove duplicates" : op === "sorted" ? "sort by name" : op === "limit" ? "keep first 10" : op === "flatMap" ? "flatten List<List<X>>" : "tap each element for logging"}.`,
        code: [
          `List<${pick(PRIMITIVES, i + k)}> result = items.stream()`,
          `  .{{SLOT}}`,
          `  .collect(Collectors.toList());`,
        ],
        options: [
          { id: "a", text: op === "filter" ? "filter(Objects::nonNull)" : op === "map" ? "map(User::getName)" : op === "distinct" ? "distinct()" : op === "sorted" ? "sorted(Comparator.comparing(User::getName))" : op === "limit" ? "limit(10)" : op === "flatMap" ? "flatMap(List::stream)" : "peek(x -> log.info(\"{}\", x))", correct: true },
          { id: "b", text: op === "filter" ? "map(Objects::nonNull)" : op === "map" ? "filter(User::getName)" : op === "distinct" ? "limit(1)" : op === "sorted" ? "filter(Comparator.comparing(User::getName))" : op === "limit" ? "skip(10)" : op === "flatMap" ? "map(List::stream)" : "forEach(log::info)", correct: false, wrongTitle: "Wrong operator", wrongExplain: `${op} is the operator that ${op === "filter" ? "drops" : op === "map" ? "transforms" : op === "distinct" ? "dedups" : op === "sorted" ? "orders" : op === "limit" ? "caps size" : op === "flatMap" ? "flattens nested streams" : "observes without modifying"}. Re-pick.` },
          { id: "c", text: op === "filter" ? "collect(Objects::nonNull)" : op === "map" ? "reduce(User::getName)" : op === "distinct" ? "groupBy(x->x)" : op === "sorted" ? "reduce(Comparator.comparing(User::getName))" : op === "limit" ? "count(10)" : op === "flatMap" ? "reduce(List::stream)" : "collect(log::info)", correct: false, wrongTitle: "Terminal/wrong arity", wrongExplain: "That terminal op consumes the stream; you need an intermediate op here." },
        ],
        correctSim: { rows: [{ number: op, state: "Stream pipeline compiled & ran", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Pipeline .${op}(...) applied`, tone: "ok" }] },
        correctTeach: { title: `${op} is an intermediate op`, explain: "Intermediates are lazy — they only run when a terminal op (collect/count/reduce) executes." },
      }));
    }
  });

  TERMINAL_OPS.forEach((op, i) => {
    for (let k = 0; k < 4; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-st-term-${op}-${seq}`,
        category: "streams",
        level: 2,
        filename: `${op}_term_${seq}.java`,
        title: `Pick the correct terminal op to ${op === "count" ? "return how many" : op === "collect" ? "gather into a List" : op === "reduce" ? "sum prices" : op === "forEach" ? "send each to a sink" : op === "findFirst" ? "grab the first match" : op === "anyMatch" ? "ask 'is any X?'" : "ask 'are all Xs?'"}.`,
        code: [
          `var r = items.stream()`,
          `  .filter(Item::isActive)`,
          `  .{{SLOT}};`,
        ],
        options: [
          { id: "a", text: op === "count" ? "count()" : op === "collect" ? "collect(Collectors.toList())" : op === "reduce" ? "mapToDouble(Item::getPrice).sum()" : op === "forEach" ? "forEach(sink::accept)" : op === "findFirst" ? "findFirst()" : op === "anyMatch" ? "anyMatch(Item::isUrgent)" : "allMatch(Item::isValid)", correct: true },
          { id: "b", text: "map(Item::isActive)", correct: false, wrongTitle: "Intermediate op", wrongExplain: "`map` returns a Stream — the pipeline needs a terminal op to actually run." },
          { id: "c", text: "peek(System.out::println)", correct: false, wrongTitle: "Also intermediate (and lazy)", wrongExplain: "`peek` returns a Stream and won't run without a terminal op." },
        ],
        correctSim: { rows: [{ number: op, state: "Terminal op consumed the stream", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `.${op}(...) returned result`, tone: "ok" }] },
        correctTeach: { title: "Streams need a terminal op", explain: "No terminal → pipeline never runs. Common terminals: collect, count, reduce, forEach, find*, *Match." },
      }));
    }
  });

  return out;
}

/* ============ SPRING BOOT ============ */
function springPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  SPRING_ANNOS.forEach((a, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-spr-anno-${seq}`,
        category: "spring-boot",
        level: 1 + ((i + k) % 3),
        filename: `App${seq}.java`,
        title: `Which annotation should you put on a class that should ${a.purpose}?`,
        code: [
          `// Class signature:`,
          `{{SLOT}}`,
          `public class ${["UserController", "UserService", "UserRepo", "Helper", "AppConfig", "Wiring"][i % 6]} { ... }`,
        ],
        options: [
          { id: "a", text: a.anno, correct: true },
          { id: "b", text: "@Bean", correct: false, wrongTitle: "@Bean goes on methods", wrongExplain: "`@Bean` declares a single bean factory method inside a `@Configuration` class. It is not a class-level marker." },
          { id: "c", text: "@SpringBootApplication", correct: false, wrongTitle: "Reserved for the main app class", wrongExplain: "`@SpringBootApplication` is a meta-annotation for the bootstrap class. Don't sprinkle it on services/controllers." },
        ],
        correctSim: { rows: [{ number: a.anno, state: "Bean registered with Spring", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Component scan picked up ${a.anno} class`, tone: "ok" }] },
        correctTeach: { title: "Stereotype annotations are semantic", explain: "@Service / @Repository / @Controller all extend @Component but signal intent. Spring uses them for AOP and exception translation." },
      }));
    }
  });

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-spr-di-${seq}`,
      category: "spring-boot",
      level: 2,
      filename: `Service${seq}.java`,
      title: `Inject a dependency safely (final field, no Spring magic in tests).`,
      code: [
        `@Service`,
        `public class OrderService {`,
        `  {{SLOT}}`,
        `  public OrderService(OrderRepo repo) { this.repo = repo; }`,
        `}`,
      ],
      options: [
        { id: "a", text: "private final OrderRepo repo;", correct: true },
        { id: "b", text: "@Autowired private OrderRepo repo;", correct: false, wrongTitle: "Field injection breaks testability", wrongExplain: "Field injection hides the dependency from constructors — can't `new OrderService(mock)` in tests. Prefer constructor injection with `final`." },
        { id: "c", text: "public OrderRepo repo = new OrderRepo();", correct: false, wrongTitle: "Bypasses Spring entirely", wrongExplain: "`new`-ing the dependency removes DI benefits — no swapping in tests, no managed lifecycle." },
      ],
      correctSim: { rows: [{ number: "OrderService", state: "Constructed with mockable repo", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Constructor injection — final field set once", tone: "ok" }] },
      correctTeach: { title: "Constructor injection > field injection", explain: "Final fields + single ctor = immutable, testable, and Spring auto-wires it without `@Autowired` (since 4.3)." },
    }));
  }

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-spr-tx-${seq}`,
      category: "spring-boot",
      level: 2 + (i % 2),
      filename: `TxService${seq}.java`,
      title: `Wrap a method in a transaction so partial failures roll back.`,
      code: [
        `@Service`,
        `public class PaymentService {`,
        `  {{SLOT}}`,
        `  public void charge(Order o) { ... }`,
        `}`,
      ],
      options: [
        { id: "a", text: "@Transactional", correct: true },
        { id: "b", text: "@Async", correct: false, wrongTitle: "Different concern", wrongExplain: "@Async runs the method on another thread. It does NOT manage transactions." },
        { id: "c", text: "synchronized", correct: false, wrongTitle: "Locking ≠ transactions", wrongExplain: "`synchronized` is JVM mutex; transactions are DB scoped. Different layer entirely." },
      ],
      correctSim: { rows: [{ number: "PaymentService.charge", state: "Wrapped in TX, rolls back on exception", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Proxy intercepted call — commit on success, rollback on RuntimeException", tone: "ok" }] },
      correctTeach: { title: "@Transactional uses Spring AOP proxies", explain: "Calls from outside the bean go through the proxy. Self-calls (`this.method()`) bypass it — common interview gotcha." },
    }));
  }

  return out;
}

/* ============ JVM ============ */
function jvmPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  for (let i = 0; i < 12; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-jvm-gc-${seq}`,
      category: "jvm",
      level: 1 + (i % 3),
      filename: `flags${seq}.sh`,
      title: `Pick the JVM flag to use the modern low-pause collector on a service with a ${4 + i}GB heap.`,
      code: [
        `java {{SLOT}} -Xmx${4 + i}g -jar app.jar`,
      ],
      options: [
        { id: "a", text: "-XX:+UseG1GC", correct: true },
        { id: "b", text: "-XX:+UseConcMarkSweepGC", correct: false, wrongTitle: "CMS is deprecated/removed", wrongExplain: "CMS was removed in Java 14. Use G1 (default since 9) or ZGC/Shenandoah for very large heaps." },
        { id: "c", text: "-XX:+UseSerialGC", correct: false, wrongTitle: "Single-threaded GC", wrongExplain: "Serial GC pauses the whole app on one thread — fine for tiny CLI tools, terrible for services." },
      ],
      correctSim: { rows: [{ number: "G1GC", state: `${4 + i}GB heap, pause < 100ms`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "G1 selected — region-based concurrent collector", tone: "ok" }] },
      correctTeach: { title: "G1 is the modern default", explain: "For heaps > 16GB consider ZGC or Shenandoah — sub-10ms pauses at the cost of throughput." },
    }));
  }

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-jvm-oom-${seq}`,
      category: "jvm",
      level: 2,
      filename: `oom${seq}.txt`,
      title: `Production hit OutOfMemoryError. Which flag gives you a post-mortem?`,
      code: [
        `java {{SLOT}} -jar app.jar`,
      ],
      options: [
        { id: "a", text: "-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/dumps", correct: true },
        { id: "b", text: "-verbose:gc", correct: false, wrongTitle: "Useful but not a dump", wrongExplain: "`-verbose:gc` logs collections — handy for tuning, but doesn't capture the heap at the moment of OOM." },
        { id: "c", text: "-XX:+PrintGCDetails", correct: false, wrongTitle: "Old logging flag, not a dump", wrongExplain: "Print flags don't write a heap snapshot. Combine HeapDumpOnOutOfMemoryError + HeapDumpPath for a post-mortem .hprof." },
      ],
      correctSim: { rows: [{ number: "hprof", state: "/var/dumps/java_pid12345.hprof", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "OOM hit → dump written → open in Eclipse MAT", tone: "ok" }] },
      correctTeach: { title: "Always set HeapDumpOnOutOfMemoryError in prod", explain: "Pair with HeapDumpPath to control where it lands. The .hprof opens in Eclipse MAT / VisualVM / async-profiler." },
    }));
  }

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-jvm-stack-${seq}`,
      category: "jvm",
      level: 2 + (i % 2),
      filename: `stack${seq}.txt`,
      title: `App stuck under load — how do you grab a thread dump live?`,
      code: [
        `// pid=12345`,
        `{{SLOT}}`,
      ],
      options: [
        { id: "a", text: "jstack 12345 > dump.txt", correct: true },
        { id: "b", text: "java -dump 12345", correct: false, wrongTitle: "No such java subcommand", wrongExplain: "The `java` launcher doesn't dump threads. Use `jstack` or `jcmd <pid> Thread.print`." },
        { id: "c", text: "top -H 12345", correct: false, wrongTitle: "Shows threads, not stacks", wrongExplain: "`top -H` lists threads with CPU usage — handy alongside, but doesn't give you JVM stack frames." },
      ],
      correctSim: { rows: [{ number: "jstack", state: "Captured all thread stacks", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Look for BLOCKED on monitors / deadlocks", tone: "ok" }] },
      correctTeach: { title: "jstack / jcmd for live thread dumps", explain: "`jcmd <pid> Thread.print` is the modern alternative — no separate tool to install on JDK 9+." },
    }));
  }

  return out;
}

let cache: Question[] | null = null;
export function javaGeneratedQuestions(): Question[] {
  if (cache) return cache;
  cache = [...collectionsPool(), ...concurrencyPool(), ...streamsPool(), ...springPool(), ...jvmPool()];
  return cache;
}
export function javaGeneratedQuestionsFor(cat: Category): Question[] {
  return javaGeneratedQuestions().filter((q) => q.category === cat);
}
