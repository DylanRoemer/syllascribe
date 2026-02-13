"""Generate synthetic syllabus PDF fixtures for testing.

Run: python generate_fixtures.py
Requires: fpdf2 (pip install fpdf2)
"""

import os
from fpdf import FPDF


def generate_synthetic_syllabus():
    """Generate a realistic text-based syllabus PDF with various date formats."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "CS 101 - Introduction to Computer Science", ln=True, align="C")

    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, "Spring 2026 | Prof. Jane Smith", ln=True, align="C")
    pdf.cell(0, 8, "Monday/Wednesday 10:00-11:15 AM | Room 204", ln=True, align="C")
    pdf.ln(6)

    # Course Description
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Course Description", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6,
        "This course provides an introduction to computer science fundamentals, "
        "including algorithms, data structures, programming paradigms, and "
        "computational thinking. Students will gain hands-on experience through "
        "weekly programming assignments and a final project."
    )
    pdf.ln(4)

    # Important Dates section
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Important Dates", ln=True)
    pdf.set_font("Helvetica", "", 11)

    important_dates = [
        "First day of class: January 12, 2026",
        "Last day to add/drop: January 23, 2026",
        "Midterm Exam: March 4, 2026",
        "Spring Break (No Class): March 16 - March 20, 2026",
        "Final Project Due: April 27, 2026",
        "Final Exam: May 6, 2026",
    ]
    for line in important_dates:
        pdf.cell(0, 7, f"  * {line}", ln=True)
    pdf.ln(4)

    # Schedule section
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Course Schedule", ln=True)
    pdf.set_font("Helvetica", "", 11)

    schedule = [
        ("Week 1", "Jan 12", "Introduction to CS; Course overview"),
        ("Week 2", "Jan 19", "Variables, Types, and Expressions"),
        ("Week 3", "Jan 26", "Control Flow: Conditionals and Loops"),
        ("", "Jan 30", "Homework 1 Due: Basic Python"),
        ("Week 4", "Feb 2", "Functions and Abstraction"),
        ("", "Feb 13", "Homework 2 Due: Control Flow"),
        ("Week 5", "Feb 16", "Lists and Strings"),
        ("Week 6", "Feb 23", "Dictionaries and Sets"),
        ("", "Feb 27", "Quiz 1"),
        ("Week 7", "Mar 2", "Midterm Review"),
        ("", "Mar 4", "MIDTERM EXAM"),
        ("Week 8", "Mar 9", "File I/O and Exceptions"),
        ("", "Mar 16-20", "SPRING BREAK - NO CLASS"),
        ("Week 9", "Mar 23", "Object-Oriented Programming I"),
        ("Week 10", "Mar 30", "Object-Oriented Programming II"),
        ("", "Apr 3", "Homework 3 Due: OOP"),
        ("Week 11", "Apr 6", "Recursion"),
        ("", "Apr 10", "Quiz 2"),
        ("Week 12", "Apr 13", "Sorting Algorithms"),
        ("Week 13", "Apr 20", "Data Structures: Stacks and Queues"),
        ("", "Apr 24", "Homework 4 Due: Algorithms"),
        ("Week 14", "Apr 27", "Final Project Presentations; Final Project Due"),
        ("", "May 6", "FINAL EXAM (2:00 PM)"),
    ]

    # Header
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(30, 7, "Week", border=1)
    pdf.cell(30, 7, "Date", border=1)
    pdf.cell(130, 7, "Topic / Assignment", border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 10)
    for week, date_str, topic in schedule:
        pdf.cell(30, 7, week, border=1)
        pdf.cell(30, 7, date_str, border=1)
        pdf.cell(130, 7, topic, border=1)
        pdf.ln()

    pdf.ln(4)

    # Grading section with a numeric date format
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Grading Policy", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6,
        "Homework (40%), Quizzes (10%), Midterm (20%), Final Exam (20%), "
        "Final Project (10%). Late submissions lose 10% per day. "
        "Last day to submit late work: 4/30/2026."
    )
    pdf.ln(4)

    # Office Hours with different date reference
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Office Hours", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, "Prof. Smith: Tuesdays and Thursdays, 2:00-3:30 PM, Office 312", ln=True)
    pdf.cell(0, 7, "TA Office Hours: Fridays 1:00-3:00 PM, Lab 105", ln=True)
    pdf.cell(0, 7, "No office hours on 3/16 through 3/20 (Spring Break).", ln=True)

    # Save
    output_path = os.path.join(os.path.dirname(__file__), "synthetic_syllabus.pdf")
    pdf.output(output_path)
    print(f"Generated: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_synthetic_syllabus()
    print("Done!")
