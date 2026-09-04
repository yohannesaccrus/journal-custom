import { Accordion } from "@/components/personalize-journal/Accordion";
import { IframeResizeReporter } from "@/components/personalize-journal/IframeResizeReporter";
import { LovedByHundreds } from "@/components/personalize-journal/LovedByHundreds";
import { ReviewsMarquee, type Review } from "@/components/personalize-journal/ReviewsMarquee";

// Where the Google rating badge links to -- the business's own Google Knowledge Panel search result.
const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?sca_esv=a362b3da5b4ff7be&rlz=1C5CHFA_enCO992US994&cs=1&output=search&kgmid=/g/11x8jt91h9&q=Sanaya+Jewelry+-+Bali+Charms+Bar&shem=epsd1,rimspwouoh&shndl=30&source=sh/x/loc/uni/m1/1&kgs=4b9f3eeaef4ee0a8&utm_source=epsd1,rimspwouoh,sh/x/loc/uni/m1/1";

// Where the "Personalize" / "Start personalizing" buttons send the visitor --
// the real Shopify product page that embeds the actual customizer iframe
// (see theme/sections/jc-embed.liquid), so the shopper stays on the Sanaya
// domain with the normal header/footer/cart around the tool.
const CUSTOMIZER_URL = "https://sanayajewelry.com/products/customized-jc";

const STARS = "★★★★★";

function Stars({ className = "" }: { className?: string }) {
  return <span className={`text-[#f5c518] tracking-tight ${className}`}>{STARS}</span>;
}

const GALLERY_IMAGES = [
  { src: "/personalize-journal/gallery-1.webp", alt: "Assortment of Sanaya journal covers" },
  { src: "/personalize-journal/gallery-2.webp", alt: "Stack of journals held in hand" },
  { src: "/personalize-journal/gallery-3.webp", alt: "Pink and red journals on a marble table" },
  { src: "/personalize-journal/gallery-4.webp", alt: "Stack of journals balanced on a sneaker" },
];

const HOW_IT_WORKS = [
  { n: 1, img: "/personalize-journal/step-leather.webp", title: "Choose your leather", desc: "Classic or animal print, every cover is unique." },
  { n: 2, img: "/personalize-journal/step-elastics.webp", title: "Pick your elastics", desc: "11 colors to match your mood." },
  { n: 3, img: "/personalize-journal/step-notebooks.webp", title: "Select your notebooks", desc: "3 inside: to-do, lined, blank or grid." },
  { n: 4, img: "/personalize-journal/step-charms.webp", title: "Add the magic", desc: "Charms, gold corners, pen holder, pocket." },
];

const INCLUDED = [
  { n: "01", title: "One leather cover, made in Bali", desc: "Upcycled cow leather, hand-dyed by our local partner. Choose between classic and animal print finishes." },
  { n: "02", title: "3 inner notebooks of your choice", desc: "To-do, lined, blank or grid. Mix them as you wish. 100 pages each, 80gsm paper." },
  { n: "03", title: "4 colored elastics", desc: "3 hold your notebooks in place, 1 closes the journal. Pick your accent color from 11 shades." },
  { n: "04", title: "Sanaya signature packaging", desc: "Every journal ships in our handcrafted Balinese box. Gift-ready." },
];

const REVIEWS: Review[] = [
  {
    initial: "K",
    color: "#8a7a6a",
    name: "Kristýna Polišenská",
    meta: "Local Guide · 19 reviews",
    text: "Absolutely magical experience at Sanaya in Canggu ✨ I honestly cannot recommend this place enough. From the moment I walked in, the entire atmosphere felt so peaceful, inspiring, and full of beautiful energy. The …",
    time: "3 months ago",
    photo: "/personalize-journal/review-1.png",
  },
  {
    initial: "J",
    color: "#1a9e96",
    name: "Joshua Candelaria",
    meta: "2 reviews",
    text: "This place was so fun! It was nice to personalize and create my own journal! Quality is amazing and so many different charms to add to make it really your own. Staff is so nice and comes with Matcha!!",
    time: "a month ago",
    photo: "/personalize-journal/review-2.png",
  },
  {
    initial: "S",
    color: "#c47a3d",
    name: "Samantha Penner",
    meta: "1 review",
    text: "Such a fun, magical place! We made journals, and Sanaya has so many covers and charms to fully customize your journal. The staff was super helpful and organized. This was the perfect keepsake for our trip to Bali!",
    time: "a month ago",
    photo: "/personalize-journal/review-3.png",
  },
  {
    initial: "A",
    color: "#9b59b6",
    name: "Allylouche F.",
    meta: "10 reviews",
    text: "We had an amazing expérience with Azima! She was verry pacient and helpfull. The store is also beautiful and there is a lot of choices in Charles and fabric. I reccomend!",
    time: "a month ago",
    photo: "/personalize-journal/review-4.png",
  },
  {
    initial: "M",
    color: "#4a6a5a",
    name: "Melanie Huynh",
    meta: "Local Guide · 79 reviews",
    text: "My friends and I had the best time making our customized journals at Sanaya Jewelry. We walked in on a Saturday afternoon and spent about an hour putting together our journals choosing the journal cover, strings, journal pages, and charm …",
    time: "3 months ago",
    photo: "/personalize-journal/review-5.png",
  },
  {
    initial: "S",
    color: "#e8a33d",
    name: "S J",
    meta: "Local Guide · 38 reviews",
    text: "Obsessed with our custom journals! We were guided the whole process in the journal workshop, and shown exactly how to assemble them ourselves. I asked for help and the staff kindly helped attach the charms for me so it looked perfect. …",
    time: "4 months ago",
    photo: "/personalize-journal/review-6.png",
  },
  {
    initial: "Z",
    color: "#c2748f",
    name: "Zareena Irene",
    meta: "10 reviews",
    text: "Love everything about it. Creating your own journal to how you want it. Very friendly and helpful as well. Definitely recommend to all the girlies out there ❤️",
    time: "a month ago",
    photo: "/personalize-journal/review-7.png",
  },
  {
    initial: "T",
    color: "#7c6fe0",
    name: "Tahlia Gascoigne",
    meta: "7 reviews",
    text: "I had the best experience today at Sanaya we had Icha she helped us through the process. we made 3 fabulous journals. would definitely recommend for the girl trip!!!!",
    time: "4 months ago",
    photo: "/personalize-journal/review-8.png",
  },
  {
    initial: "A",
    color: "#e07c9a",
    name: "Aurélie mllc",
    meta: "2 reviews",
    text: "There is a lot of choices for customization, the place is calm and you have time to make you book. Amazing staff so kind, they listen to you. The matcha is excellent too. I recommend 💗",
    time: "a month ago",
    photo: "/personalize-journal/review-9.png",
  },
  {
    initial: "S",
    color: "#2fa88a",
    name: "Sophie Kusubashi",
    meta: "4 reviews",
    text: "Loved making the journals! They turned out super cute and the service was really nice and helpful. Overall great experience",
    time: "a month ago",
    photo: "/personalize-journal/review-10.png",
  },
  {
    initial: "C",
    color: "#e0703c",
    name: "Cassie Cheng",
    meta: "4 reviews",
    text: "Such a fun experience! I had a great time with Rachel and Clarissa! They helped me create such a beautiful journal! Would highly recommend ❤️",
    time: "4 months ago",
    photo: "/personalize-journal/review-11.png",
  },
];

const PROMISES = [
  { icon: "gift", label: "Packaging signature", desc: "Beautifully packaged in our signature Sanaya box." },
  { icon: "chat", label: "24/7 concierge", desc: "Our dedicated team is just a message away." },
  { icon: "bag", label: "Complimentary shipping", desc: "It's on us for all orders over $100." },
  { icon: "return", label: "30-day returns", desc: "Enjoy stress-free exchanges and returns for 30 days." },
];

function PromiseIcon({ icon }: { icon: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", className: "h-6 w-6" } as const;
  if (icon === "gift")
    return (
      <svg {...common}>
        <path d="M20 7H4v13h16V7Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7h20v4H2V7Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v13M12 7C10 3 6 3 6 5.5S9 7 12 7ZM12 7c2-4 6-4 6-1.5S15 7 12 7Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (icon === "chat")
    return (
      <svg {...common}>
        <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  if (icon === "bag")
    return (
      <svg {...common}>
        <path d="M6 8h12l1 12H5L6 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 12a8 8 0 1 1 2.5 5.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 8v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="15" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none">
        30
      </text>
    </svg>
  );
}

export default function PersonalizeJournalPage() {
  return (
    <main className="bg-white text-[#171717]">
      <IframeResizeReporter />
      {/* ---------------- Section 1: product hero ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 overflow-hidden rounded-md bg-[#f2efe6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/personalize-journal/workshop-steps.webp" alt="Journal workshop steps" className="w-full object-cover" />
            </div>
            {GALLERY_IMAGES.map((g) => (
              <div key={g.src} className="overflow-hidden rounded-md bg-[#f2efe6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.alt} className="aspect-square w-full object-cover" />
              </div>
            ))}
            <div className="col-span-2 overflow-hidden rounded-md bg-[#f2efe6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/personalize-journal/gallery-wide.webp" alt="Hands with a decorated Sanaya scrapbook journal" className="w-full object-cover" />
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 text-sm">
              <Stars />
              <span className="font-semibold">Rated 4.8/5</span>
              <span className="text-[#8a887f]">- 1279 customer reviews</span>
            </div>

            <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-3xl">Customized Journal</h1>

            <p className="mt-2 text-lg">
              <span className="mr-2 text-[#8a887f] line-through">$69.00 SGD</span>
              <span className="font-semibold">$52.00 SGD</span>
            </p>

            <p className="mt-4 border-t border-[#e5e2da] pt-4 text-sm text-[#8a887f]">
              Configure your journal in 4 steps. Final price updates as you add options.
            </p>

            <ul className="mt-4 space-y-2 border-b border-[#e5e2da] pb-5 text-sm">
              {[
                ["Genuine Bali leather", "handcrafted from upcycled offcuts and dyed by hand."],
                ["No two are alike", "you design every detail in minutes."],
                ["Built to last", "made to follow you through years of stories."],
              ].map(([bold, rest]) => (
                <li key={bold} className="flex gap-2">
                  <span className="mt-0.5 text-[#0f3d34]">✓</span>
                  <span>
                    <strong>{bold}</strong>, {rest}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={CUSTOMIZER_URL}
              className="mt-5 block rounded-md bg-[#0f3d34] py-3.5 text-center font-medium text-white transition-colors hover:bg-[#0c332b]"
            >
              Personalize
            </a>

            <div className="mt-4 flex gap-3 rounded-md bg-[#f7f5f0] p-4">
              <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 shrink-0 text-[#0f3d34]">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold">30-day guarantee</p>
                <p className="mt-1 text-[#6b6a63]">
                  Try your new jewelry at home without any risk. If it&apos;s not the perfect fit or you simply change your mind, you
                  can easily get your money back.
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm font-semibold">Loved by hundreds</p>
            <LovedByHundreds
              items={[1, 2, 3, 4, 5].map((i) => ({
                src: `/personalize-journal/loved-${i}.webp`,
                alt: `Customer wearing/using their Sanaya journal, photo ${i}`,
              }))}
            />

            <div className="mt-6">
              <Accordion heading="Description" defaultOpen>
                <p>A journal made for keepers, dreamers and travellers. Handcrafted in Bali from upcycled leather, every cover is unique, no two grains alike.</p>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Fully customizable</strong>: leather, elastics, notebooks and extras, all yours to pick.
                  </li>
                  <li>
                    <strong>Built to last</strong>: genuine cow leather, hand-dyed by our local artisans.
                  </li>
                  <li>
                    <strong>Format A5</strong>: 14.8 × 21 cm, with 3 inner notebooks (100 pages each).
                  </li>
                  <li>
                    <strong>Sanaya signature</strong>: delivered in our exclusive Bali-inspired packaging.
                  </li>
                </ul>
              </Accordion>
              <Accordion heading="Shipping" defaultOpen>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>Standard Shipping</strong>: 2 to 3 weeks - Free on orders over 70€
                  </li>
                  <li>
                    <strong>Express Shipping</strong>: 3 to 8 business days
                  </li>
                  <li>
                    <strong>In-Store Pickup</strong>: Usually ready within 2 hours - Free
                  </li>
                </ul>
              </Accordion>
              <Accordion heading="Exchanges & Returns">
                <p>Customer satisfaction is our priority.</p>
                <p className="mt-3">
                  Products purchased on our website can be exchanged or returned up to 30 days after the receipt date. Please note
                  that return shipping costs are the responsibility of the customer.
                </p>
              </Accordion>
              <Accordion heading="Warranty">
                <p>
                  Sanaya jewelry comes with a comprehensive 6-month warranty, excluding normal wear and tear (micro-scratches,
                  slight loss of shine).
                </p>
              </Accordion>
            </div>

            <div className="mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/personalize-journal/payment-methods.png" alt="Accepted payment methods" className="h-6 w-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Section 2: How it works ---------------- */}
      <section className="border-t border-[#e5e2da] bg-white px-6 py-16 text-center sm:px-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#0f3d34]">HOW IT WORKS</p>
        <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl">Build your journal in 4 steps</h2>
        <p className="mt-3 text-[#6b6a63]">A guided experience. No skill needed, just instinct.</p>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.n} className="flex flex-col items-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-[#f2efe6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.img} alt="" className="h-full w-full object-cover" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0f3d34] text-xs font-semibold text-white">
                  {step.n}
                </span>
              </div>
              <p className="mt-4 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-[#6b6a63]">{step.desc}</p>
            </div>
          ))}
        </div>

        <a
          href={CUSTOMIZER_URL}
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-[#0f3d34] px-8 py-3.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-[#0c332b]"
        >
          START PERSONALIZING
          <span aria-hidden>→</span>
        </a>
      </section>

      {/* ---------------- Section 3: What's included ---------------- */}
      <section className="border-t border-[#e5e2da] px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="group aspect-[5/4] overflow-hidden rounded-md bg-[#f2efe6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personalize-journal/included.webp"
              alt="Journal with charms held in hand"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>
          <div className="rounded-md bg-[#f7f5f0] p-8 sm:p-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#0f3d34]">WHAT&apos;S INCLUDED</p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl">Everything your story needs.</h2>
            <dl className="mt-8 space-y-6">
              {INCLUDED.map((item) => (
                <div key={item.n} className="flex gap-4">
                  <dt className="font-[family-name:var(--font-playfair)] text-2xl text-[#0f3d34]">{item.n}</dt>
                  <dd>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-[#6b6a63]">{item.desc}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- Section 4: Craftsmanship ---------------- */}
      <section className="bg-[#0f3d34] px-6 py-16 text-white sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="aspect-[5/4] overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personalize-journal/craftsmanship.webp"
              alt="Sanaya atelier in Bali"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs tracking-[0.2em] text-white/70">OUR CRAFTSMANSHIP</p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl">Expertise &amp; Passion</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/85">
              <p>
                Driven by our <strong className="text-white">love for craftsmanship</strong> and <strong className="text-white">timeless design</strong>,
                we shape pieces <strong className="text-white">made to last</strong> and follow you through your days.
              </p>
              <p>
                Every Sanaya piece is <strong className="text-white">curated or assembled</strong> in our ateliers in{" "}
                <strong className="text-white">Paris and Bali</strong>, where our team watches over each step with{" "}
                <strong className="text-white">care and precision</strong>.
              </p>
              <p>
                We work primarily with <strong className="text-white">high-quality stainless steel</strong>, chosen for its{" "}
                <strong className="text-white">water resistance</strong> and lasting strength.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Section 5: Reviews ---------------- */}
      <section className="border-t border-[#e5e2da] px-6 py-16 text-center sm:px-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#8a887f]">CUSTOMER REVIEWS</p>
        <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl">Loved by travellers in Bali</h2>
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#e5e2da] px-4 py-2 text-sm transition-colors hover:bg-[#f7f5f0]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4285F4] ring-1 ring-[#e5e2da]">
            G
          </span>
          <Stars className="text-sm" />
          <span className="font-semibold">4.9</span>
          <span className="text-[#8a887f]">· 500+ Reviews on Google</span>
        </a>

        <ReviewsMarquee reviews={REVIEWS} />
      </section>

      {/* ---------------- Section 6: Promise strip ---------------- */}
      <section className="border-t border-[#e5e2da] px-6 py-10 sm:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-[#e5e2da] text-center sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {PROMISES.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-2 px-4 py-6 sm:py-0">
              <div className="text-[#0f3d34] opacity-80">
                <PromiseIcon icon={p.icon} />
              </div>
              <p className="text-xs font-semibold tracking-[0.15em]">{p.label.toUpperCase()}</p>
              <p className="text-xs text-[#6b6a63]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
