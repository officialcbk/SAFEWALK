import { LandingNav } from './LandingNav'
import { Hero } from './Hero'
import { TrustStrip } from './TrustStrip'
import { PressStrip } from './PressStrip'
import { HowItWorks } from './HowItWorks'
import { FeatureGrid } from './FeatureGrid'
import { Showcase } from './Showcase'
import { Stats } from './Stats'
import { Reviews } from './Reviews'
import { FAQ } from './FAQ'
import { FinalCTA } from './FinalCTA'
import { Footer } from './Footer'

export default function LandingPage() {
  return (
    <div style={{ background: 'white', color: '#1A1A28', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <LandingNav/>
      <Hero/>
      <TrustStrip/>
      <PressStrip/>
      <HowItWorks/>
      <FeatureGrid/>
      <Showcase/>
      <Stats/>
      <Reviews/>
      <FAQ/>
      <FinalCTA/>
      <Footer/>
    </div>
  )
}
