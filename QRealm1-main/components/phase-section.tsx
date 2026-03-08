"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export interface ChapterTopic {
  label: string
}

export interface Chapter {
  number: number
  title: string
  description?: string
  topics: ChapterTopic[]
}

export interface Phase {
  number: number
  title: string
  description: string
  chapters: Chapter[]
}

export function PhaseSection({ phase }: { phase: Phase }) {
  return (
    <section className="glass-card rounded-xl transition-all duration-500 hover:-translate-y-1">
      {/* Phase Header */}
      <div className="border-b border-[hsl(0,0%,100%,0.06)] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-saffron-500/20 to-saffron-600/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-saffron-400">
            Phase {phase.number}
          </span>
          <h2 className="font-serif text-lg font-semibold text-foreground md:text-xl">
            {phase.title}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {phase.description}
        </p>
      </div>

      {/* Chapters Accordion */}
      <Accordion type="multiple" className="px-2">
        {phase.chapters.map((chapter) => (
          <AccordionItem
            key={chapter.number}
            value={`chapter-${chapter.number}`}
            className="border-[hsl(0,0%,100%,0.05)]"
          >
            <AccordionTrigger className="px-4 py-4 text-left text-sm font-medium text-foreground transition-colors duration-300 hover:text-saffron-300 hover:no-underline">
              <span className="flex items-center gap-3">
                <span className="shrink-0 rounded-md bg-saffron-500/10 px-2.5 py-1 font-serif text-xs font-semibold text-saffron-400">
                  Ch {chapter.number}
                </span>
                <span>{chapter.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5">
              {/* Chapter description if available */}
              {chapter.description && (
                <p className="mb-4 pl-12 text-sm leading-relaxed text-muted-foreground/80">
                  {chapter.description}
                </p>
              )}
              {/* Subtopics */}
              <ul className="flex flex-col gap-2.5 pl-12">
                {chapter.topics.map((topic) => (
                  <li
                    key={topic.label}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400/50" />
                    <span>{topic.label}</span>
                  </li>
                ))}
              </ul>
              {/* Open Discussion button */}
              <div className="mt-4 pl-12">
                <button className="saffron-underline text-xs font-medium text-saffron-400 transition-colors duration-300 hover:text-saffron-300">
                  Open Discussion →
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
