import Image from 'next/image'

export default function ContentSection() {
    return (
        <section className="py-16 md:py-24" id="content">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
                <h2 className="relative z-10 max-w-xl text-4xl font-medium lg:text-5xl">
                    Empowering Student Well-being with Aasha AI
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 md:gap-6 lg:gap-12">
                    <div className="relative mb-6 sm:mb-0">
                        <div className="bg-linear-to-b aspect-76/59 relative rounded-2xl from-zinc-300 to-transparent p-px dark:from-zinc-700">
                            <Image src="https://images.unsplash.com/photo-1461532257246-777de18cd58b" className="hidden rounded-[15px] dark:block" alt="payments illustration dark" width={1207} height={907} />
                            <Image src="https://images.unsplash.com/photo-1461532257246-777de18cd58b" className="rounded-[15px] shadow dark:hidden" alt="payments illustration light" width={1207} height={907} />
                        </div>
                    </div>

                    <div className="relative space-y-4">
                        <p className="text-muted-foreground">
                            Aasha AI bridges the gap in traditional mental health support by offering <span className="text-accent-foreground font-bold">confidential, always-available conversations</span> and practical coping tools for college students.
                        </p>
                        {/* <p className="text-muted-foreground">
                            Built with advanced AI and NLP, it provides empathetic chats, resource navigation, and skill building.
                        </p> */}

                        <div className="pt-6">
                            <blockquote className="border-l-4 pl-4">
                                <p>
                                    Aasha AI made it easy to talk about my struggles without fear or judgment. The support and resources helped me feel understood and empowered to take control of my mental health.
                                </p>

                                <div className="mt-6 space-y-3">
                                    <cite className="block font-medium">Amba Singh, Student</cite>
                                    <Image className="h-5 w-fit" src="/vitb.png" alt="vitb Logo" height={60} width={60} />
                                </div>
                            </blockquote>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}