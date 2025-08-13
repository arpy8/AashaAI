export default function FAQs() {
    return (
        <section className="scroll-py-16 py-16 md:scroll-py-32 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-y-12 px-2 lg:[grid-template-columns:1fr_auto]">
                    <div className="text-center lg:text-left">
                        <h2 className="mb-4 text-3xl font-semibold md:text-4xl">
                            Frequently <br className="hidden lg:block" /> Asked <br className="hidden lg:block" />
                            Questions
                        </h2>
                        <p>Your questions about Aasha AI, answered.</p>
                    </div>

                    <div className="divide-y divide-dashed sm:mx-auto sm:max-w-lg lg:mx-0">
                        <div className="pb-6">
                            <h3 className="font-medium">Is my conversation with Aasha AI private?</h3>
                            <p className="text-muted-foreground mt-4">
                                Yes. All chats are confidential and securely stored. Your identity and information are never shared with third parties without your consent.
                            </p>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">When can I use Aasha AI?</h3>
                            <p className="text-muted-foreground mt-4">
                                Aasha AI is available 24/7, so you can reach out for support or guidance anytime you need, day or night.
                            </p>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">How does Aasha AI help with mental wellness?</h3>
                            <p className="text-muted-foreground my-4">
                                Aasha AI offers empathetic conversations, coping strategies, resource navigation, and skill-building tools to help you manage stress, anxiety, and other challenges.
                            </p>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium">Can Aasha AI connect me to professional help?</h3>
                            <p className="text-muted-foreground mt-4">
                                Yes. If needed, Aasha AI can guide you to university counseling services or external mental health professionals and help with appointment scheduling.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}