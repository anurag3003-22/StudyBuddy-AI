import { db } from "@/lib/db";

// ============================================================
// StudyBuddy AI — Demo Seed Data
// Scenario from the pitch deck: "DBMS exam in 7 days, weak in
// normalization." Notes use "--- Page N ---" markers so the
// Doubt-Solving Agent can cite exact pages.
// ============================================================

export const SEED_NOTES = [
  {
    title: "DBMS Unit 3 — Normalization & Functional Dependencies",
    subject: "DBMS",
    pages: 12,
    content: `--- Page 1 --- Course Intro to Normalization
Normalization is the process of organizing relational tables to reduce redundancy and improve data integrity. Un-normalized designs suffer from three classic anomalies: insertion anomaly (cannot add a fact without another fact being present), update anomaly (same fact stored in many rows — must update all), deletion anomaly (deleting a row accidentally removes an unrelated fact). Normal forms progress from 1NF through 2NF, 3NF, BCNF, and beyond.
--- Page 2 --- Functional Dependencies & Armstrong's Axioms
A functional dependency X -> Y means: for any two rows, if they agree on X they must agree on Y. Armstrong's axioms: reflexivity (Y subset of X => X -> Y), augmentation (X -> Y implies XZ -> YZ), and transitivity (X -> Y and Y -> Z implies X -> Z). From these derive union, decomposition and pseudo-transitivity. A candidate key is a minimal set of attributes that determines all others.
--- Page 3 --- First Normal Form (1NF)
A relation is in 1NF if every attribute holds an atomic (indivisible) value and there are no repeating groups or multi-valued columns. Example violation: a phone column storing "9876543210, 9123456780". Fix: split into separate rows or a separate table. 1NF also requires each row to be uniquely identifiable by a primary key.
--- Page 4 --- Second Normal Form (2NF)
A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the whole candidate key — no partial dependency on part of a composite key. Classic violation: SCORE(student_id, course_id, grade, student_name) — student_name depends only on student_id. Fix: decompose into SCORE(student_id, course_id, grade) and STUDENT(student_id, student_name).
--- Page 5 --- Third Normal Form (3NF)
A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the candidate key. Violation: EMP(emp_id, dept_id, dept_name) — emp_id -> dept_id -> dept_name. The 3NF theorem: for every FD X -> Y, either X is a superkey or Y is a prime attribute. Fix: move dept_name into a DEPT table.
--- Page 6 --- Boyce-Codd Normal Form (BCNF)
BCNF is the stricter version of 3NF: for every non-trivial functional dependency X -> Y, X must be a superkey. 3NF permits X -> Y when Y is prime; BCNF does not. Typical BCNF violation involves overlapping composite candidate keys, e.g. ENROLL(student, course, instructor) where instructor -> course and (student, instructor) is a key.
--- Page 7 --- BCNF Decomposition & Lossless Join
To reach BCNF, iteratively pick a dependency X -> Y that violates BCNF, decompose R into (X union Y) and (R - Y), and repeat. Every BCNF decomposition is guaranteed lossless (the shared attribute X is a key of one component). However, BCNF decomposition may NOT preserve dependencies — this is the classic tradeoff examiners love to test.
--- Page 8 --- Quick Comparison Table
1NF: atomic values, no repeating groups. 2NF: 1NF + no partial dependency on composite keys. 3NF: 2NF + no transitive dependency. BCNF: every determinant is a superkey. Higher forms: 4NF removes multi-valued dependencies; 5NF removes join dependencies. Exam tip: always check candidate keys FIRST, then walk the ladder.
--- Page 9 --- Lossless vs Dependency-Preserving Decomposition
A decomposition is lossless if joining the components recovers exactly the original relation (no spurious tuples). Binary decomposition is lossless iff the shared attributes contain a key of at least one component. Dependency preservation means every FD of the original schema can be checked in one component. 3NF can always achieve both; BCNF guarantees only losslessness.
--- Page 10 --- Multi-Valued Dependencies & 4NF
A multi-valued dependency X ->-> Y means each X value associates with a set of Y values independent of other attributes. Violation example: SKILL(emp, language, certification) where an employee has independent sets of languages and certs, creating cross-product redundancy. 4NF: for every non-trivial MVD X ->-> Y, X is a superkey.
--- Page 11 --- 5NF / PJNF Essentials
Fifth normal form (project-join normal form) deals with join dependencies — a relation decomposable into three or more projections that recombine without spurious tuples. 5NF is rare in practice but appears in theory papers. Domain-key normal form (DKNF) is the "ultimate" normal form with only domain and key constraints.
--- Page 12 --- PYQ Patterns on Normalization
Frequently asked: (1) Given R(A,B,C,D) and FDs, find candidate keys and highest normal form. (2) Decompose to BCNF showing each step lossless. (3) Explain why BCNF may not preserve dependencies with example. (4) 2NF vs 3NF vs BCNF comparison table. (5) Definitions with small examples of each anomaly. Practice: normalize a STUDENT-COURSE-INSTRUCTOR schema step by step.`,
  },
  {
    title: "DBMS Unit 2 — SQL & Relational Algebra",
    subject: "DBMS",
    pages: 9,
    content: `--- Page 1 --- SQL Landscape
SQL is declarative: you specify WHAT to retrieve, the query engine decides HOW. Three sub-languages: DDL (CREATE, ALTER, DROP), DML (SELECT, INSERT, UPDATE, DELETE), DCL (GRANT, REVOKE). Logical query processing order: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT.
--- Page 2 --- Joins Deep-Dive
INNER JOIN returns matching pairs. LEFT/RIGHT OUTER JOIN keeps unmatched rows from one side padded with NULLs. FULL OUTER JOIN keeps both sides. CROSS JOIN is the Cartesian product. Self-join pairs a table with itself using aliases — classic use: employee-manager hierarchies.
--- Page 3 --- Aggregation & Grouping
COUNT/SUM/AVG/MIN/MAX collapse groups; WHERE filters rows BEFORE grouping, HAVING filters groups AFTER. Common trap: selecting a non-grouped column without an aggregate. GROUP BY on multiple columns nests the grouping granularity.
--- Page 4 --- Subqueries & CTEs
Scalar subqueries return one value; correlated subqueries re-evaluate per outer row (think EXISTS). CTEs (WITH clause) improve readability and can be recursive — recursive CTEs walk trees and generate sequences. Window functions (ROW_NUMBER, RANK, DENSE_RANK, SUM OVER PARTITION) order and aggregate without collapsing rows.
--- Page 5 --- Relational Algebra Basics
Core operators: selection (sigma) filters rows, projection (pi) picks columns, union, set-difference, Cartesian product, rename. Derived: intersection, join, division. Relational algebra is procedural — it forms the blueprint SQL engines implement.
--- Page 6 --- Set vs Bag Semantics
SQL defaults to bag (multiset) semantics — duplicates allowed unless DISTINCT. Union ALL keeps duplicates; plain UNION deduplicates. Relational algebra is set-based. Exam questions often ask which SQL constructs reintroduce duplicates.
--- Page 7 --- Views & Materialized Views
A view is a stored query — virtual table, no data copied, always fresh. A materialized view physically stores the result and needs refresh. Views simplify authorization (column-level hiding) and abstraction.
--- Page 8 --- NULL Semantics
NULL means unknown, not zero or empty string. Comparisons with NULL yield UNKNOWN, filtered by WHERE. IS NULL / IS NOT NULL are the safe checks. COUNT(*) counts NULL rows; COUNT(col) skips NULLs. NULL in aggregates: SUM/AVG ignore NULLs.
--- Page 9 --- PYQ Patterns on SQL
Frequently asked: (1) Top-N per group using window functions. (2) Second-highest salary — five different ways. (3) Employees earning more than their manager (self-join). (4) Convert correlated subquery to join. (5) Find duplicate rows and delete keeping one. (6) Relational algebra expression for "students enrolled in ALL courses" — uses division.`,
  },
  {
    title: "DBMS Unit 4 — Transactions & Concurrency Control",
    subject: "DBMS",
    pages: 8,
    content: `--- Page 1 --- ACID Properties
Atomicity: all-or-nothing execution (undo on crash). Consistency: constraints hold before and after. Isolation: concurrent transactions do not observe each other's partial states. Durability: committed writes survive crashes (WAL + checkpoints).
--- Page 2 --- Transaction States & Schedule
States: active -> partially committed -> committed, or -> failed -> aborted. A schedule is a sequence of operations from a set of transactions. Serial schedules are always correct but slow; the goal is concurrency equivalent to some serial order.
--- Page 3 --- Concurrency Anomalies
Dirty read (reading uncommitted data), lost update (two writes clobber each other), unrepeatable read (same query returns different values in one txn), phantom read (new rows appear matching a re-executed predicate). Each isolation level eliminates a subset of these.
--- Page 4 --- Locking Protocols
Shared (S) locks for reads, exclusive (X) locks for writes. Two-Phase Locking: acquire-all then release-all — guarantees conflict-serializability but not deadlock-freedom. Deadlock handling: wait-for graphs + victim selection, or timestamps with wound-wait / wait-die.
--- Page 5 --- Timestamp & Multiversion Concurrency
Timestamp ordering assigns each transaction a number; operations must respect timestamp order or abort. MVCC (used by PostgreSQL, Oracle) keeps multiple row versions so readers never block writers — the foundation of snapshot isolation.
--- Page 6 --- Serializability Testing
Conflict-equivalence: same order of conflicting operations (read-write, write-read, write-write on same data item) as some serial schedule. Precedence graph: draw an edge Ti -> Tj for every conflict; schedule is serializable iff the graph is ACYCLIC.
--- Page 7 --- Recovery Essentials
Write-Ahead Logging: log record flushed BEFORE the data page. Undo-list for uncommitted, redo-list for committed-but-not-flushed. Checkpoints truncate recovery work. STEAL/NO-FORCE policies trade I/O against recovery complexity.
--- Page 8 --- PYQ Patterns on Transactions
Frequently asked: (1) Build the precedence graph and decide serializability. (2) Show a schedule that is 2PL but deadlocks. (3) Map anomalies to isolation levels (Read Uncommitted through Serializable). (4) Explain ARIES-style undo/redo with a log excerpt. (5) Why does MVCC avoid phantom reads at snapshot level.`,
  },
  {
    title: "DBMS Unit 5 — Indexing & Query Optimization",
    subject: "DBMS",
    pages: 6,
    content: `--- Page 1 --- Why Indexes
An index is an auxiliary structure mapping search keys to row locations. Without one, scans read every page; with a B+ tree index, point lookups cost O(log N). Cost: extra storage and slower writes — indexes are pure read-optimization tradeoffs.
--- Page 2 --- B+ Trees
Balanced multi-way trees; all data pointers live in leaf nodes, internal nodes only guide search. Leaves are linked for efficient range scans. Order d node holds up to 2d keys. Height stays tiny: a 3-level tree indexes millions of rows. Insertions may split nodes; deletions may merge or redistribute.
--- Page 3 --- Hash & Bitmap Indexes
Static hashing maps keys via hash function — O(1) equality lookup, useless for ranges. Extendable/linear hashing grows gracefully. Bitmap indexes shine on low-cardinality columns (gender, status) with AND/OR bit operations for analytical queries.
--- Page 4 --- Clustered vs Secondary
A clustered index dictates physical row order — only one per table (often the PK); the table itself is the index. Secondary indexes store (key -> row-id) and require a hop to the actual row. Covering indexes satisfy a whole query from the index alone — no table access.
--- Page 5 --- Query Optimization
System-R style optimization: enumerate join orders, estimate costs with statistics (histograms, cardinalities), prune with dynamic programming. Heuristics: push selections down, project early, smallest intermediate result first. Modern CBOs (cost-based optimizers) explore plan space with branch-and-bound.
--- Page 6 --- PYQ Patterns on Indexing
Frequently asked: (1) Construct a B+ tree after a sequence of insertions/deletions. (2) Compute I/O cost of a query with and without an index. (2) When does the optimizer ignore an index (low selectivity, function on column, leading wildcard)? (4) Design indexes for a given workload mix. (5) Clustered vs unclustered cost comparison for range queries.`,
  },
];

export const SEED_TOPIC_PROGRESS = [
  { subject: "DBMS", topic: "Normalization & FDs", mastery: 42, attempts: 3 },
  { subject: "DBMS", topic: "SQL & Relational Algebra", mastery: 68, attempts: 4 },
  { subject: "DBMS", topic: "Transactions & Concurrency", mastery: 55, attempts: 3 },
  { subject: "DBMS", topic: "Indexing & B+ Trees", mastery: 31, attempts: 2 },
];

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/**
 * Idempotent demo seed. Safe to call on every stats/notes request —
 * it only writes when the database is empty.
 */
export async function ensureSeeded(): Promise<void> {
  const noteCount = await db.note.count();
  if (noteCount === 0) {
    await db.note.createMany({ data: SEED_NOTES });
  }

  const progressCount = await db.topicProgress.count();
  if (progressCount === 0) {
    await db.topicProgress.createMany({ data: SEED_TOPIC_PROGRESS });
  }

  const attemptCount = await db.quizAttempt.count();
  if (attemptCount === 0) {
    const now = Date.now();
    const day = 86400000;
    await db.quizAttempt.createMany({
      data: [
        { subject: "DBMS", topic: "SQL & Relational Algebra", score: 3, total: 5, createdAt: new Date(now - 6 * day) },
        { subject: "DBMS", topic: "Transactions & Concurrency", score: 4, total: 5, createdAt: new Date(now - 5 * day) },
        { subject: "DBMS", topic: "Normalization & FDs", score: 2, total: 5, createdAt: new Date(now - 4 * day) },
        { subject: "DBMS", topic: "SQL & Relational Algebra", score: 4, total: 5, createdAt: new Date(now - 3 * day) },
        { subject: "DBMS", topic: "Indexing & B+ Trees", score: 2, total: 5, createdAt: new Date(now - 2 * day) },
        { subject: "DBMS", topic: "Normalization & FDs", score: 3, total: 5, createdAt: new Date(now - 1 * day) },
      ],
    });
  }

  const userCount = await db.userProfile.count();
  if (userCount === 0) {
    await db.userProfile.create({
      data: {
        name: "Student",
        streak: 5,
        lastActiveDay: yesterdayKey(),
        xp: 1240,
      },
    });
  }
}
