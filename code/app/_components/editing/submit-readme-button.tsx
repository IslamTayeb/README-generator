"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Github } from 'lucide-react'

interface SubmitReadmeButtonProps {
  markdown: string;
  repoUrl: string;
  className?: string;
}

export function SubmitReadmeButton({ markdown, repoUrl, className }: SubmitReadmeButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    console.log('Submit button clicked');
    console.log('Data to submit:', {
      repoUrl,
      markdownLength: markdown?.length || 0
    });

    setIsSubmitting(true)
    try {
      console.log('Sending request to backend');
      const response = await fetch('http://localhost:3001/api/github/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          repoUrl,
          content: markdown,
        }),
      })

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(`Failed to update README: ${data.error}`);
      }

      toast({
        title: "Success",
        description: "README.md has been updated successfully!",
      })
    } catch (error) {
      console.error('Error submitting README:', error);
      toast({
        title: "Error",
        description: "Failed to update README.md. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting}
      className={className}
    >
      <Github className="mr-2 h-4 w-4" />
      {isSubmitting ? "Submitting..." : "Submit to GitHub"}
    </Button>
  )
}
