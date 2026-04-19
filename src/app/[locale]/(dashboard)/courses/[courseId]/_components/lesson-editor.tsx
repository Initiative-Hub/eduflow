import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface LessonEditorProps {
  editTitle: string;
  setEditTitle: (val: string) => void;
  editContent: string;
  setEditContent: (val: string) => void;
  isUpdatingLesson: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function LessonEditor({
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  isUpdatingLesson,
  onCancel,
  onSave,
}: LessonEditorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Lesson Title</label>
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="font-semibold text-lg"
        />
      </div>
      <div className="space-y-2 flex-1 flex flex-col">
        <label className="text-sm font-medium">
          Lesson Content (Markdown / Text)
        </label>
        <Textarea
          className="flex-1 min-h-[400px] resize-none font-mono text-sm leading-relaxed p-4"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Write your lesson content here..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isUpdatingLesson}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
