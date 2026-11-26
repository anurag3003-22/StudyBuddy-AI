"""Bundled demo notes so the app is usable the moment it starts."""

from __future__ import annotations

import io
from pathlib import Path

from .config import DEMO_DIR
from .rag.ingest import build_chunks
from .rag.store import get_store
from .rag.text import title_from_filename

DEMO_PAGES: list[tuple[int, str]] = [
    (
        1,
        """Unit 3: Database Normalization
Normalization is the process of organizing data in a database to reduce redundancy and eliminate
update, insert and delete anomalies. A poorly designed schema repeats the same fact in many rows,
so a single change must be made in many places and can easily become inconsistent.

The main anomalies are insertion anomaly, deletion anomaly and update anomaly. Normalization
decomposes large tables into smaller relations connected by foreign keys, so every fact is stored
once. The normal forms are applied in order: 1NF, 2NF, 3NF and BCNF. Each form removes a specific
class of dependency problem. Normalization is a design activity performed before physical storage
decisions such as indexing.
""",
    ),
    (
        2,
        """Functional Dependencies
A functional dependency X -> Y means that the value of attribute set X uniquely determines the
value of attribute set Y. If two tuples agree on X they must also agree on Y. Functional
dependencies are the formal tool used to reason about normalization.

A partial dependency exists when a non-prime attribute depends on only part of a composite candidate
key. A transitive dependency exists when a non-prime attribute depends on another non-prime
attribute rather than directly on a candidate key. A multivalued dependency occurs when one
attribute determines a set of independent values and is removed by fourth normal form.

Armstrong's axioms (reflexivity, augmentation and transitivity) let us derive all dependencies
implied by a given set. The closure of a set of attributes is the set of all attributes it can
determine.
""",
    ),
    (
        3,
        """First Normal Form (1NF)
First normal form requires that every attribute holds only atomic, indivisible values. Repeating
groups and multi-valued columns are not allowed. A relation in 1NF has a defined primary key and no
column contains a list, a set or a nested table.

For example, a Student table with a column PhoneNumbers containing "98765, 91234" violates 1NF.
The fix is to create a separate StudentPhone table with one row per phone number, linked by
student_id. 1NF is the baseline for every other normal form; a relation that is not in 1NF is not
considered relational in the formal sense.
""",
    ),
    (
        4,
        """Second Normal Form (2NF)
Second normal form requires the relation to be in 1NF and every non-prime attribute to be fully
functionally dependent on the whole candidate key. 2NF removes partial dependencies, which can only
occur when the primary key is composite.

Consider Enrolment(student_id, course_id, student_name, course_name) with the composite key
(student_id, course_id). Here student_name depends only on student_id, which is a partial
dependency. To reach 2NF we split the relation into Student(student_id, student_name) and
Course(course_id, course_name), leaving Enrolment(student_id, course_id) as the link table. A
relation with a single-attribute primary key and no partial dependencies is automatically in 2NF.
""",
    ),
    (
        5,
        """Third Normal Form (3NF)
Third normal form requires the relation to be in 2NF and to have no transitive dependencies. Every
non-prime attribute must depend directly on a candidate key, not on another non-prime attribute.

The classic example is Student(student_id, dept_id, dept_name). Here dept_name depends on dept_id,
and dept_id is not a key, so the dependency student_id -> dept_id -> dept_name is transitive. The
3NF decomposition is Student(student_id, dept_id) plus Department(dept_id, dept_name). 3NF is
usually sufficient for OLTP systems because it preserves dependencies and can always be achieved
without losing information.
""",
    ),
    (
        6,
        """Boyce-Codd Normal Form (BCNF)
Boyce-Codd normal form is a stronger version of 3NF. A relation is in BCNF if, for every non-trivial
functional dependency X -> Y, X is a superkey. BCNF removes anomalies caused by overlapping
candidate keys that 3NF still permits.

Example: CourseTeacher(student, course, teacher) where one teacher teaches only one course, but a
course can have many teachers. The dependency teacher -> course holds, yet teacher is not a
superkey, so the relation is in 3NF but not BCNF. Decompose into TeacherCourse(teacher, course) and
StudentCourse(student, course). BCNF decomposition can occasionally lose dependency preservation,
so some designers stop at 3NF for reporting workloads.

Exam tip: check every determinant, not just the primary key. If any determinant is not a superkey,
the relation is not in BCNF.
""",
    ),
    (
        7,
        """Entity Relationship Model
The entity relationship model describes data as entities, attributes and relationships. An entity
is a distinguishable object such as Student or Course. A relationship is an association between
entities, and its degree is the number of participating entity types.

Cardinality expresses how many instances of one entity relate to another: one-to-one, one-to-many
or many-to-many. Participation can be total or partial. Weak entities do not have a key of their
own and depend on an identifying owner. Converting an ER diagram to tables maps entities to
relations, many-to-many relationships to junction tables, and one-to-many relationships to foreign
keys on the many side.
""",
    ),
    (
        8,
        """Transactions and ACID Properties
A transaction is a logical unit of work that must execute completely or not at all. The ACID
properties are atomicity, consistency, isolation and durability.

Atomicity guarantees all-or-nothing execution. Consistency moves the database from one valid state
to another. Isolation ensures concurrent transactions do not observe each other's intermediate
state. Durability guarantees committed changes survive a crash, usually through write-ahead logging.

Isolation levels trade correctness for concurrency: read uncommitted, read committed, repeatable
read and serializable. Serializable prevents dirty reads, non-repeatable reads and phantom reads.
A schedule is conflict-serializable if it can be transformed into a serial schedule by swapping
non-conflicting operations. Two-phase locking uses a growing phase and a shrinking phase to ensure
serializability, while deadlock is handled by prevention, detection or timeout.
""",
    ),
    (
        9,
        """Indexing and Query Performance
An index is an auxiliary data structure that speeds up retrieval at the cost of extra storage and
slower writes. A B+ tree index stores keys in sorted order and supports range queries efficiently,
which makes it the default index in most relational databases.

A clustered index determines the physical order of rows, so a table can have only one. A secondary
or non-clustered index stores pointers to rows. A composite index on (a, b) can serve queries that
filter on a or on a and b, but usually not on b alone; this is the leftmost prefix rule.

Indexes should be created on columns used in WHERE, JOIN and ORDER BY clauses with high
selectivity. Low-selectivity columns such as gender rarely benefit. Covering indexes include all
columns needed by a query so the table itself is never read.
""",
    ),
    (
        10,
        """SQL Joins and Aggregation
An inner join returns only rows with matching keys in both tables. A left outer join returns all
rows from the left table plus matches from the right, filling NULL where there is no match. A right
outer join is the mirror image, and a full outer join keeps unmatched rows from both sides.

A cross join produces the Cartesian product and is usually accidental when a join condition is
missing. A self join joins a table to itself and is used for hierarchies such as employee and
manager.

GROUP BY collapses rows into groups and is normally combined with aggregate functions COUNT, SUM,
AVG, MIN and MAX. HAVING filters groups after aggregation, while WHERE filters rows before
aggregation. A subquery in the FROM clause is a derived table, and a correlated subquery references
the outer query and is evaluated per row.
""",
    ),
]


def _build_demo_pdf(pages: list[tuple[int, str]]) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="DBMS Complete Notes",
    )
    styles = getSampleStyleSheet()
    body = styles["BodyText"]
    body.fontSize = 11
    body.leading = 16
    heading = styles["Heading1"]

    flow = []
    for index, (_, text) in enumerate(pages):
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        flow.append(Paragraph(lines[0], heading))
        flow.append(Spacer(1, 0.4 * cm))
        for line in lines[1:]:
            flow.append(Paragraph(line, body))
            flow.append(Spacer(1, 0.15 * cm))
        if index < len(pages) - 1:
            flow.append(PageBreak())
    document.build(flow)
    return buffer.getvalue()


def demo_pdf_path() -> Path:
    return DEMO_DIR / "DBMS_Complete_Notes.pdf"


def seed_demo_notes(force: bool = False) -> dict:
    """Create and ingest the bundled DBMS notes exactly once."""
    store = get_store()
    existing = [doc for doc in store.list_documents() if doc.filename == demo_pdf_path().name]
    if existing and not force:
        return {"seeded": False, "documents": len(store.list_documents())}

    if force:
        for doc in existing:
            store.delete_document(doc.id)

    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    path = demo_pdf_path()
    if not path.exists() or force:
        path.write_bytes(_build_demo_pdf(DEMO_PAGES))

    title = title_from_filename(path.name)
    chunks = build_chunks("demo-dbms", title, "DBMS", DEMO_PAGES)
    store.add_document(
        title=title,
        filename=path.name,
        subject="DBMS",
        pages=len(DEMO_PAGES),
        chunks=chunks,
        size_bytes=path.stat().st_size,
        doc_id="demo-dbms",
    )
    return {"seeded": True, "documents": len(store.list_documents()), "chunks": len(chunks)}
