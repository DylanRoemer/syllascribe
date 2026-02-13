"""Setup for the shared Syllascribe package."""

from setuptools import setup, find_packages

setup(
    name="syllascribe-shared",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "pdfplumber>=0.10",
        "python-docx>=1.1",
        "pytesseract>=0.3",
        "dateparser>=1.2",
        "icalendar>=5.0",
        "Pillow>=10.0",
        "pydantic>=2.5",
    ],
    python_requires=">=3.11",
)
