import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePollDialogProps {
  onClose: () => void;
  onPollCreated: (pollData: {
    question: string;
    options: string[];
    duration: number;
  }) => void;
}

export function CreatePollDialog({ onClose, onPollCreated }: CreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(1440); // 24 hours in minutes

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    onPollCreated({
      question: question.trim(),
      options: validOptions,
      duration
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background">
          <h2 className="text-xl font-bold">Create Poll</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    maxLength={50}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 4 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-2 text-primary hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add option
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value={60}>1 hour</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>1 day</option>
              <option value={4320}>3 days</option>
              <option value={10080}>7 days</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
}
