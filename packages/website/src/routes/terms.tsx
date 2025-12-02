import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

export function meta() {
  return [
    { title: "Terms of Service - Survive the Night" },
    {
      name: "description",
      content: "Terms of service for Survive the Night game.",
    },
  ];
}

function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          to="/"
          className="inline-block mb-8 text-red-500 hover:text-red-400 transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-red-600 mb-6">
          Terms of Service
        </h1>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p className="text-sm text-gray-500">
            Last updated: November 7, 2025
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and playing Survive the Night ("the Game"), you accept and agree to be bound
              by the terms and provisions of this agreement. If you do not agree to these Terms of Service,
              please do not use the Game.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Description of Service</h2>
            <p>
              Survive the Night is a free-to-play multiplayer online survival game. We reserve the right
              to modify, suspend, or discontinue the Game at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. User Conduct</h2>
            <p>
              You agree to use the Game only for lawful purposes. You agree not to:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Use offensive, inappropriate, or vulgar usernames</li>
              <li>Cheat, exploit bugs, or use unauthorized third-party software</li>
              <li>Harass, abuse, or harm other players</li>
              <li>Attempt to gain unauthorized access to the Game or its systems</li>
              <li>Distribute malware, viruses, or malicious code</li>
              <li>Impersonate other players or game administrators</li>
              <li>Engage in any activity that disrupts or interferes with the Game</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Account and Username</h2>
            <p>
              You are responsible for choosing an appropriate username. We reserve the right to remove,
              ban, or modify any username that violates these terms or is deemed inappropriate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Intellectual Property</h2>
            <p>
              All content in the Game, including but not limited to graphics, code, designs, and game
              mechanics, is the property of the Game developers and is protected by copyright and other
              intellectual property laws. You may not copy, reproduce, distribute, or create derivative
              works without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Disclaimer of Warranties</h2>
            <p>
              THE GAME IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT
              GUARANTEE THAT THE GAME WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. USE THE GAME AT YOUR
              OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL THE GAME DEVELOPERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE GAME,
              EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">8. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your access to the Game at any time, without
              notice, for conduct that we believe violates these Terms of Service or is harmful to other
              players, us, or third parties, or for any other reason.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">9. User-Generated Content</h2>
            <p>
              Any content you create or share while using the Game (such as chat messages) remains your
              responsibility. You grant us a non-exclusive license to use, display, and distribute such
              content as necessary to provide the Game service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">10. Modifications to Terms</h2>
            <p>
              We reserve the right to modify, update, or change these Terms of Service at any time without
              prior notice. All changes will be effective immediately upon posting to this page. Your continued
              access to or use of the Game after any such changes constitutes your binding acceptance of the
              modified Terms of Service. It is your responsibility to check this page periodically for updates.
              We may, but are not obligated to, notify users of material changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">11. Age Restrictions</h2>
            <p>
              The Game is not intended for children under 13 years of age. By using the Game, you represent
              that you are at least 13 years old.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">12. Privacy</h2>
            <p>
              Your use of the Game is also governed by our Privacy Policy. Please review our{" "}
              <Link to="/privacy" className="text-red-500 hover:text-red-400 underline">
                Privacy Policy
              </Link>{" "}
              to understand our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">13. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through our GitHub
              repository or game support channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">15. Severability</h2>
            <p>
              If any provision of these Terms of Service is found to be unenforceable or invalid, that
              provision will be limited or eliminated to the minimum extent necessary so that these Terms
              of Service will otherwise remain in full force and effect.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
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

