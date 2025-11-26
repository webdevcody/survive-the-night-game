import type { Route } from "./+types";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { PRICING_CONFIG, formatPrice } from "~/config/pricing";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pricing - Survive the Night" },
    {
      name: "description",
      content: "Pricing plans for Survive the Night game.",
    },
  ];
}

export default function Pricing() {
  const plan = PRICING_CONFIG;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Link
          to="/"
          className="inline-block mb-8 text-red-500 hover:text-red-400 transition-colors"
        >
          ← Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-red-600 mb-4">
            Pricing
          </h1>
          <p className="text-gray-400 text-lg">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-12">
          {/* Pricing Card */}
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm rounded-xl border-2 border-red-600/40 shadow-lg shadow-red-950/20 hover:shadow-red-950/40 transition-all duration-300 p-8 max-w-md w-full">
            {/* Discount Badge */}
            <div className="absolute -top-4 right-4 bg-red-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
              {plan.discountPercent}% OFF
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">{plan.name}</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-gray-500 line-through text-xl">
                    {formatPrice(plan.originalPrice)}
                  </span>
                  <span className="text-4xl font-bold text-red-500">
                    {formatPrice(plan.discountedPrice)}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-2">{plan.paymentType}</p>
              </div>

              <ul className="text-left space-y-3 mb-8 text-gray-300">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg shadow-lg shadow-red-900/50 transition-all hover:shadow-red-900/70 hover:scale-105"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <Link
            to="/"
            className="text-red-500 hover:text-red-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

