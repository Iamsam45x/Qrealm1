from app.db import get_conn
import uuid
from datetime import datetime, timezone

def now_iso():
    return datetime.now(timezone.utc).isoformat()

print('=== Creating Sample Data ===')
print()

# Get users for author assignments
with get_conn() as conn:
    # PostgreSQL uses single-quoted string literals; double quotes are identifiers.
    admin = conn.execute("SELECT id FROM users WHERE role = 'ADMIN'").fetchone()
    admin_id = admin['id'] if admin else None
    
    student = conn.execute("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1").fetchone()
    student_id = student['id'] if student else admin_id
    
    professor = conn.execute("SELECT id FROM users WHERE role = 'PROFESSOR' LIMIT 1").fetchone()
    professor_id = professor['id'] if professor else admin_id
    
    print(f'Using Admin: {admin_id[:8]}...')
    print(f'Using Student: {student_id[:8]}...')
    print(f'Using Professor: {professor_id[:8]}...')

# Sample blogs
blogs = [
    {
        'id': str(uuid.uuid4()),
        'title': 'Introduction to Quantum Computing',
        'slug': 'introduction-to-quantum-computing',
        'content': '''Quantum computing represents a fundamental shift in computational paradigms. Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or "qubits" that can exist in superposition of both states simultaneously.

This remarkable property, along with quantum entanglement and interference, allows quantum computers to process vast amounts of information in parallel. For certain problems, particularly those involving optimization, cryptography, and simulation of quantum systems, quantum computers offer exponential speedups over their classical counterparts.

Key concepts include:
- Superposition: Qubits can exist in multiple states at once
- Entanglement: Qubits can be correlated in ways that have no classical analogue
- Quantum gates: Operations that manipulate qubits
- Measurement: Collapsing the quantum state to obtain a classical result

The race to build practical quantum computers is heating up, with major tech companies and governments investing billions of dollars in research and development.''',
        'author_id': professor_id,
        'published': True
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'The Copenhagen Interpretation Explained',
        'slug': 'copenhagen-interpretation-explained',
        'content': '''The Copenhagen interpretation is one of the oldest and most commonly taught interpretations of quantum mechanics. It was developed primarily by Niels Bohr and Werner Heisenberg in the 1920s during the early development of quantum theory.

Core Principles:

1. Wave Function as Probability
The wave function doesn't describe the physical reality of a quantum particle but rather contains all the information we can know about it. The square of the wave function gives the probability density of finding the particle at a given location.

2. Quantum Superposition
Before measurement, a quantum system exists in a superposition of all possible states. It's only when we measure the system that the wave function "collapses" to one definite state.

3. Complementarity
Physical phenomena at the quantum scale exhibit complementary properties that cannot be observed or measured simultaneously.

4. Heisenberg Uncertainty Principle
Certain pairs of physical properties, like position and momentum, cannot both be known simultaneously with arbitrary precision.

Criticism and Alternatives:
Despite its widespread use, the Copenhagen interpretation has faced criticism for its apparent "measurement problem" - the vague definition of what constitutes a measurement and when wave function collapse occurs.''',
        'author_id': professor_id,
        'published': True
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'Understanding Quantum Entanglement',
        'slug': 'understanding-quantum-entanglement',
        'content': '''Quantum entanglement is perhaps the most counterintuitive phenomenon in all of physics. When particles become entangled, their quantum states become correlated in such a way that the state of one particle instantly influences the state of its entangled partner, regardless of the distance between them.

Einstein famously called this "spooky action at a distance" and spent years trying to disprove it. However, numerous experiments have confirmed that entanglement is real and that the correlations are stronger than any classical explanation can account for.

How Entanglement Works:
When two particles interact in certain ways, they can become entangled. After this, even if we separate them by millions of miles, measuring one particle will instantaneously affect what we know about the other.

Applications:
- Quantum Cryptography: Using entanglement to create unbreakable encryption
- Quantum Teleportation: Transferring quantum states between locations
- Quantum Computing: Essential for quantum gates and algorithms
- Quantum Sensing: Ultra-precise measurements

The EPR Paradox:
Einstein, Podolsky, and Rosen proposed what became known as the EPR paradox, arguing that quantum mechanics must be incomplete because it allows for this "spooky action at a distance."''',
        'author_id': admin_id,
        'published': True
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'Quantum Machine Learning: The Future of AI',
        'slug': 'quantum-machine-learning-future-ai',
        'content': '''The intersection of quantum computing and machine learning represents one of the most exciting frontiers in both fields. Quantum machine learning (QML) aims to use quantum computers to enhance machine learning algorithms, potentially providing exponential speedups for certain tasks.

Classical vs Quantum:
Classical machine learning algorithms, while powerful, face limitations when dealing with extremely large datasets or complex optimization problems. Quantum computers could potentially process exponentially large feature spaces and find global minima more efficiently.

Current Approaches:
1. Quantum Neural Networks: Neural networks with quantum circuits
2. Quantum Kernel Methods: Using quantum computers to compute kernel functions
3. Quantum Optimization: Variational quantum eigensolvers and QAOA
4. Quantum Sampling: Efficient sampling from complex distributions

Challenges:
- Quantum hardware is still in early stages
- Noise and errors in current quantum systems
- The overhead of data encoding
- Limited qubit counts and coherence times''',
        'author_id': professor_id,
        'published': False
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'Decoherence: The Enemy of Quantum Computing',
        'slug': 'decoherence-enemy-quantum-computing',
        'content': '''Decoherence is often cited as one of the biggest challenges facing quantum computing today. It refers to the loss of quantum coherence in a quantum system due to interaction with its environment.

Understanding Decoherence:
Quantum coherence is what allows qubits to exist in superposition and entanglement. However, when a quantum system interacts with its surroundings - through heat, radiation, or even stray electromagnetic fields - this coherence can be destroyed.

This is why quantum computers need to operate at extremely cold temperatures (near absolute zero) and in carefully shielded environments.

Types of Decoherence:
1. Thermal Decoherence: Caused by environmental heat
2. Phase Decoherence: Affects the relative phases in superposition
3. Amplitude Damping: Loss of qubit excitation to the environment
4. Depolarizing: Random rotation of qubit state

Coherence Times:
Modern superconducting qubits have coherence times on the order of 100 microseconds, while some ion trap systems have achieved coherence times over a second.''',
        'author_id': student_id,
        'published': True
    }
]

# Sample forums
forums = [
    {
        'id': str(uuid.uuid4()),
        'title': 'Which quantum interpretation is most compelling?',
        'content': '''I've been studying different interpretations of quantum mechanics and I'm curious what others think. The Copenhagen interpretation is standard, but the Many-Worlds interpretation is fascinating. What about pilot wave theory or QBism?

Each interpretation has its strengths and weaknesses. Copenhagen is intuitive but has the measurement problem. Many-Worlds is mathematically clean but implies a multiverse. Pilot wave theory is deterministic but nonlocal. QBism is novel but quite philosophical.

What's your take? Which interpretation resonates with you and why?''',
        'author_id': student_id
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'Quantum supremacy vs quantum advantage - what is the difference?',
        'content': '''I keep seeing these terms used interchangeably but they mean different things. Quantum supremacy (or quantum advantage) refers to when a quantum computer performs a task that classical computers practically cannot.

Google claimed quantum supremacy with their Sycamore processor in 2019, completing a calculation in 200 seconds that would take classical supercomputers thousands of years.

Quantum advantage is when quantum computers provide real-world benefits over classical methods. This is the true goal - not just proving theoretical capability but achieving practical speedups.

Where do we stand today? Are we closer to quantum advantage? Which applications show the most promise?''',
        'author_id': professor_id
    },
    {
        'id': str(uuid.uuid4()),
        'title': 'Resources for learning quantum computing from scratch?',
        'content': '''I'm a software developer looking to transition into quantum computing. I have a background in linear algebra and Python, but my physics knowledge is limited.

What resources would you recommend for someone at my level? Books, courses, online tutorials, coding exercises?

I've heard good things about:
- Qiskit textbook
- Nielsen and Chuang's quantum computing book
- IBM Quantum Experience
- Cirq documentation

But I'd love to hear from people who have actually used these resources. What's worked well for you? What should I focus on first - the physics, the math, or the programming?''',
        'author_id': student_id
    }
]

# Insert blogs
with get_conn() as conn:
    print('Creating blogs...')
    for blog in blogs:
        conn.execute('''
            INSERT INTO blogs (id, title, slug, content, author_id, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (blog['id'], blog['title'], blog['slug'], blog['content'], blog['author_id'], 
              blog['published'], now_iso(), now_iso()))
    conn.commit()
    print(f'  Created {len(blogs)} blogs')

# Insert forums
with get_conn() as conn:
    print('Creating forums...')
    for forum in forums:
        conn.execute('''
            INSERT INTO forums (id, title, content, author_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (forum['id'], forum['title'], forum['content'], forum['author_id'], now_iso(), now_iso()))
    conn.commit()
    print(f'  Created {len(forums)} forums')

# Create comments
with get_conn() as conn:
    blogs_list = conn.execute('SELECT id FROM blogs WHERE published = TRUE').fetchall()
    forums_list = conn.execute('SELECT id FROM forums').fetchall()
    users = conn.execute('SELECT id FROM users').fetchall()
    
    comments = [
        {
            'content': 'Excellent article! This really helped clarify the concepts for me. The section on superposition was particularly well explained.',
            'user_id': users[1]['id'] if len(users) > 1 else admin_id,
            'blog_id': blogs_list[0]['id'],
            'forum_id': None
        },
        {
            'content': 'I disagree with some points here. The Copenhagen interpretation has its problems, and Many-Worlds offers a cleaner solution in my opinion.',
            'user_id': users[2]['id'] if len(users) > 2 else admin_id,
            'blog_id': blogs_list[1]['id'],
            'forum_id': None
        },
        {
            'content': 'This is fascinating! The Einstein-Podolsky-Rosen paradox is one of my favorite topics in physics.',
            'user_id': users[0]['id'],
            'blog_id': blogs_list[2]['id'],
            'forum_id': None
        },
        {
            'content': 'Great question! I prefer Many-Worlds because it eliminates the need for wave function collapse, though the implications are mind-bending.',
            'user_id': professor_id,
            'blog_id': None,
            'forum_id': forums_list[0]['id']
        },
        {
            'content': 'I would recommend starting with the Qiskit textbook - it is free and very well structured for beginners.',
            'user_id': admin_id,
            'blog_id': None,
            'forum_id': forums_list[2]['id']
        }
    ]
    
    print('Creating comments...')
    for comment in comments:
        conn.execute('''
            INSERT INTO comments (id, content, user_id, blog_id, forum_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), comment['content'], comment['user_id'], comment['blog_id'], 
              comment['forum_id'], now_iso()))
    conn.commit()
    print(f'  Created {len(comments)} comments')

print()
print('=== Sample Data Created Successfully! ===')
