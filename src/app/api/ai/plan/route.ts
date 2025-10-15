import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { goal } = await request.json();

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json(
        { error: 'Goal is required and must be a string' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const prompt = `You are an AI development assistant. Break down the following goal into specific, executable steps for a web development project. Each step should be a concrete action that can be executed as a command or implemented directly.

Goal: "${goal}"

Please respond with a JSON object containing:
- steps: an array of strings, where each string is a specific step
- estimatedTime: estimated time in minutes
- complexity: "low", "medium", or "high"

Example format:
{
  "steps": [
    "Install required dependencies",
    "Create the component structure",
    "Implement the core functionality",
    "Add tests",
    "Update documentation"
  ],
  "estimatedTime": 30,
  "complexity": "medium"
}

Focus on practical, actionable steps that can be executed in a Node.js/Next.js environment.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful development planning assistant. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const messageContent = completion.choices[0]?.message?.content;
    
    if (!messageContent) {
      throw new Error('No response from AI');
    }

    // Try to parse the JSON response
    let planResult;
    try {
      planResult = JSON.parse(messageContent);
    } catch (parseError) {
      // If JSON parsing fails, create a simple plan
      planResult = {
        steps: [
          'Analyze the goal requirements',
          'Plan the implementation approach',
          'Execute the development tasks',
          'Test and verify the results'
        ],
        estimatedTime: 15,
        complexity: 'medium'
      };
    }

    return NextResponse.json({
      success: true,
      ...planResult
    });

  } catch (error) {
    console.error('AI planning error:', error);
    
    // Fallback plan if AI fails
    const fallbackPlan = {
      steps: [
        'Analyze project requirements',
        'Set up development environment',
        'Implement core functionality',
        'Test the implementation',
        'Deploy and monitor'
      ],
      estimatedTime: 20,
      complexity: 'medium'
    };

    return NextResponse.json({
      success: true,
      ...fallbackPlan,
      fallback: true
    });
  }
}