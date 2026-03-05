from database import engine, SessionLocal
from models import Base, SupportResource

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if db.query(SupportResource).first() is not None:
        print("Data already seeded.")
        return

    resources = [
        # Academic Resilience - Low Intensity
        {"hub_type": "Academic Resilience", "title": "Pomodoro Technique Guide", "description": "Learn how to use 25-minute focus intervals.", "intensity": "Low"},
        {"hub_type": "Academic Resilience", "title": "Study Group Finder", "description": "Connect with peers taking the same classes.", "intensity": "Low"},
        {"hub_type": "Academic Resilience", "title": "Library Resources Checklist", "description": "A quick guide to using campus library databases.", "intensity": "Low"},
        {"hub_type": "Academic Resilience", "title": "Note-Taking Strategies", "description": "Templates for Cornell notes and mind mapping.", "intensity": "Low"},
        {"hub_type": "Academic Resilience", "title": "Time Management Matrix", "description": "Prioritize tasks using the Eisenhower Box.", "intensity": "Low"},
        
        # Academic Resilience - High Intensity
        {"hub_type": "Academic Resilience", "title": "Academic Advisor Booking", "description": "Schedule an urgent meeting with your advisor.", "intensity": "High"},
        {"hub_type": "Academic Resilience", "title": "Tutoring Center Hotlines", "description": "Immediate help from campus peer tutors.", "intensity": "High"},
        {"hub_type": "Academic Resilience", "title": "Disability Services Contact", "description": "Request immediate accommodations.", "intensity": "High"},
        {"hub_type": "Academic Resilience", "title": "Dean of Students Office", "description": "Support for severe academic disruptions.", "intensity": "High"},
        {"hub_type": "Academic Resilience", "title": "Course Withdrawal Guide", "description": "Steps and deadlines to drop a class safely.", "intensity": "High"},

        # Emotional Well-being - Low Intensity
        {"hub_type": "Emotional Well-being", "title": "4-7-8 Breathing Technique", "description": "A quick exercise to calm nervous tension.", "intensity": "Low"},
        {"hub_type": "Emotional Well-being", "title": "Guided Journaling Prompt", "description": "Write down 3 things you are grateful for today.", "intensity": "Low"},
        {"hub_type": "Emotional Well-being", "title": "5-Minute Meditation Video", "description": "A short guided mindfulness session.", "intensity": "Low"},
        {"hub_type": "Emotional Well-being", "title": "Campus Walking Map", "description": "Scenic and safe walking routes around campus.", "intensity": "Low"},
        {"hub_type": "Emotional Well-being", "title": "Lofi Study Playlists", "description": "Curated music for relaxation and focus.", "intensity": "Low"},
        
        # Emotional Well-being - High Intensity
        {"hub_type": "Emotional Well-being", "title": "Campus Counseling Directory", "description": "Book a session or access walk-in hours.", "intensity": "High"},
        {"hub_type": "Emotional Well-being", "title": "National Suicide Prevention Lifeline", "description": "Call or text 988 for immediate 24/7 support.", "intensity": "High"},
        {"hub_type": "Emotional Well-being", "title": "Crisis Text Line", "description": "Text HOME to 741741 to connect with a Crisis Counselor.", "intensity": "High"},
        {"hub_type": "Emotional Well-being", "title": "Student Health Center Emergency", "description": "After-hours numbers for medical or mental health crises.", "intensity": "High"},
        {"hub_type": "Emotional Well-being", "title": "Sexual Assault Support Services", "description": "Confidential advocacy and support resources.", "intensity": "High"},
    ]

    for res in resources:
        db.add(SupportResource(**res))
    
    db.commit()
    db.close()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_data()
