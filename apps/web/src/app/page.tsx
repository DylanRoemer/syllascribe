"use client";

import { FileUpload } from "@/components/FileUpload";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center pt-12">
      <div className="text-center max-w-2xl mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Turn Your Syllabus Into a Calendar
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Upload a course syllabus (PDF, DOCX, or image) and Syllascribe will
          extract key dates — assignments, exams, holidays — for you to review
          and export as an <code className="text-indigo-600 font-medium">.ics</code> calendar
          file.
        </p>
      </div>

      <FileUpload />

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">1.</div>
          <h3 className="font-semibold text-gray-900 mb-1">Upload</h3>
          <p className="text-sm text-gray-500">
            Drop your syllabus — PDF, DOCX, or scanned image.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">2.</div>
          <h3 className="font-semibold text-gray-900 mb-1">Review</h3>
          <p className="text-sm text-gray-500">
            Check extracted dates, fix anything that looks off, see the source
            text.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">3.</div>
          <h3 className="font-semibold text-gray-900 mb-1">Export</h3>
          <p className="text-sm text-gray-500">
            Download a <code>.ics</code> file and import it into Google Calendar,
            Apple Calendar, or Outlook.
          </p>
        </div>
      </div>
    </div>
  );
}
