import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

export function meta() {
  return [
    { title: "Privacy Policy - Survive the Night" },
    {
      name: "description",
      content: "Privacy policy for Survive the Night game.",
    },
  ];
}

function Privacy() {
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
          Privacy Policy
        </h1>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p className="text-sm text-gray-500">
            Last updated: November 7, 2025
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p>
              When you play Survive the Night, we may collect the following information:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Username you choose when joining the game</li>
              <li>Game statistics (nights survived, kills, etc.)</li>
              <li>Technical information such as IP address for server connection</li>
              <li>Gameplay data for leaderboards and game functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Provide and maintain the game service</li>
              <li>Display leaderboards and player statistics</li>
              <li>Improve game performance and user experience</li>
              <li>Prevent cheating and maintain fair gameplay</li>
              <li>Communicate important updates about the game</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Data Storage and Security</h2>
            <p>
              We implement appropriate security measures to protect your information. However, no method of
              transmission over the internet is 100% secure. Game data is stored temporarily and may be
              retained for statistical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Third-Party Services</h2>
            <p>
              Our game may use third-party services for hosting and analytics. These services have their
              own privacy policies and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Children's Privacy</h2>
            <p>
              Our game is not directed to children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information
              from a child under 13, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Cookies and Local Storage</h2>
            <p>
              We may use browser local storage to save game preferences and settings on your device.
              This data remains on your device and can be cleared through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain gameplay data only as long as necessary to provide game services and maintain
              leaderboards. You may request deletion of your data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">8. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We reserve the right to update or modify this privacy policy at any time without prior notice.
              Changes will be effective immediately upon posting to this page. Your continued use of the Game
              after any changes constitutes your acceptance of the updated Privacy Policy. We encourage you
              to review this page periodically for any updates. The "Last updated" date at the top of this
              policy indicates when it was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our GitHub
              repository or game support channels.
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

