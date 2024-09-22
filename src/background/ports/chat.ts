import Groq from "groq-sdk";

import type { PlasmoMessaging } from "@plasmohq/messaging"

const llm =new Groq({ apiKey: process.env.GROQ_API_KEY });


const SYSTEM = `
You are a helpful assistant, Given the metadata and transcript of a YouTube video. Your primary task is to provide accurate and relevant answers to any questions based on this information. Use the available details effectively to assist users with their inquiries about the video's content, context, or any other related aspects.

START OF METADATA
Video Title: {title}
END OF METADATA

START OF TRANSCRIPT
{transcript}
END OF TRANSCRIPT
`

async function createChatCompletion(
  model: string,
  messages: any,
  context: any
) {
  const parsed = context.transcript.events
    .filter((x: { segs: any }) => x.segs)
    .map((x: { segs: any[] }) =>
      x.segs.map((y: { utf8: any }) => y.utf8).join(" ")
    )
    .join(" ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")

  const SYSTEM_WITH_CONTEXT = SYSTEM.replace(
    "{title}",
    context.metadata.title
  ).replace("{transcript}", parsed)

  messages.unshift({ role: "system", content: SYSTEM_WITH_CONTEXT })

  console.log(messages)

  return llm.chat.completions.create({
    messages: messages,
    model: "llama3-8b-8192",
    stream: true
  })
}

const handler:PlasmoMessaging.PortHandler = async (req, res) => {
  console.log('before handler');
  
  let cumulativeData = ""

  const messages = req.body.messages
  const model = req.body.model
  const context = req.body.context

  try {
    console.log(messages,'messages');
    
    const completion = await createChatCompletion(model, messages, context)
console.log(completion,'completion');

    for await (const chunk of completion) {
      cumulativeData += chunk.choices[0].delta.content
      res.send({ message: cumulativeData, error: null, isEnd: false })
    }
    res.send({ message: "END", error: null, isEnd: true })
    console.log(cumulativeData,'cummilitave data');
    
  } catch (error) {
    res.send({ error: "something went wrong" })
  }
}

export default handler
