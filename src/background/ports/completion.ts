import Groq from "groq-sdk";

import type { PlasmoMessaging } from "@plasmohq/messaging"

const llm =new Groq({ apiKey: process.env.GROQ_API_KEY });


async function createCompletion(model: string, prompt: string, context: any) {
  const parsed = context.transcript.events
    .filter((x: { segs: any }) => x.segs)
    .map((x: { segs: any[] }) =>
      x.segs.map((y: { utf8: any }) => y.utf8).join(" ")
    )
    .join(" ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")

  const USER = `${prompt}\n\nVideo Title: ${context.metadata.title}\nVideo Transcript: ${parsed}`

  return llm.chat.completions.create({
    messages: [{ role: "user", content: USER }],
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
    
    const completion = await createCompletion(model, messages, context)
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
