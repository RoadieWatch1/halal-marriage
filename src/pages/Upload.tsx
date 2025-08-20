// C:\Users\vizir\halal-marriage\src\pages\Upload.tsx
import { Link } from "react-router-dom";
import QuickUpload from "@/components/QuickUpload";

export default function Upload() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Test</h1>
        <Link to="/" className="underline">Back to Home</Link>
      </header>
      <p className="text-sm text-muted-foreground">
        You must be logged in to upload. Files go to
        <code className="mx-1">profile-media/&lt;your-user-id&gt;/...</code>.
      </p>
      <QuickUpload />
    </div>
  );
}
