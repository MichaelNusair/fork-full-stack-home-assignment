import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Comment } from '../types';

export const CommentList = ({ taskId }: { taskId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setError(null);
        const data = await api.get<Comment[]>(`/comments?taskId=${taskId}`);
        setComments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [taskId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading comments...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-sm">Error: {error}</div>;
  }

  if (comments.length === 0) {
    return <div className="text-gray-400 text-sm">No comments yet.</div>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">
              {comment.user?.name || comment.user?.username || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
        </div>
      ))}
    </div>
  );
};
