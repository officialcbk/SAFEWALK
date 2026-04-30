// SafeWalk — Auth + Onboarding screens

function SignInScreen() {
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  return (
    <Screen bg="white">
      <StatusBar />
      <div style={{ flex: 1, padding: '24px 28px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Logo size="lg" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>Welcome back</div>
            <div className="sw-muted" style={{ fontSize: 14, marginTop: 4 }}>Your safety, always on</div>
          </div>
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com" defaultValue="alex@safewalk.app" />
          </div>
          <div className="sw-field" style={{ position: 'relative' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" defaultValue="securepass" style={{ paddingRight: 44, width: '100%' }}/>
              <button onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray-text)',
                display: 'inline-flex', padding: 6,
              }}><Icon.Eye/></button>
            </div>
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 20 }} onClick={() => { setLoading(true); setTimeout(()=>setLoading(false), 1200);}}>
          {loading ? <span className="sw-spin"/> : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <a href="#" onClick={(e)=>e.preventDefault()} style={{ color: 'var(--purple-600)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          background: 'var(--purple-50)', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, color: 'var(--purple-800)',
          fontSize: 12, fontWeight: 500,
        }}>
          <Icon.Lock color="var(--purple-600)" size={14}/>
          <span>End-to-end encrypted · PIPEDA compliant</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-text)' }}>
          New here? <a href="#" onClick={e=>e.preventDefault()} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Create account →</a>
        </div>
      </div>
    </Screen>
  );
}

function SignUpScreen() {
  const [pwd, setPwd] = React.useState('walkSafe24');
  const strength = pwd.length < 6 ? { label: 'Weak', color: '#E24B4A', w: '30%' }
    : pwd.length < 10 ? { label: 'Fair', color: '#E8A020', w: '60%' }
    : { label: 'Strong', color: '#3B6D11', w: '100%' };
  return (
    <Screen bg="white">
      <StatusBar />
      <div style={{ flex: 1, padding: '24px 28px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Logo size="md" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Create account</div>
            <div className="sw-muted" style={{ fontSize: 13, marginTop: 2 }}>Safe in 2 minutes</div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field">
            <label>Full name</label>
            <input placeholder="Alex Johnson"/>
          </div>
          <div className="sw-field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com"/>
          </div>
          <div className="sw-field">
            <label>Password</label>
            <input type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} placeholder="••••••••"/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--gray-bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.w, background: strength.color, transition: 'width .2s' }}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: strength.color }}>{strength.label}</span>
            </div>
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 20 }}>Create account</button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--gray-text)' }}>
          By creating an account you agree to our{' '}
          <a href="#" onClick={e=>e.preventDefault()} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Terms</a>
          {' · '}
          <a href="#" onClick={e=>e.preventDefault()} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Privacy</a>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-text)' }}>
          Already have an account? <a href="#" onClick={e=>e.preventDefault()} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
        </div>
      </div>
    </Screen>
  );
}

function CheckEmailScreen() {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'var(--green-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Icon.Mail size={36} color="var(--green)"/>
        </div>
        <div className="sw-h1" style={{ marginBottom: 8 }}>Check your email</div>
        <div className="sw-body" style={{ marginBottom: 4 }}>We sent a confirmation link to</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>alex@safewalk.app</div>
        <div className="sw-body" style={{ marginBottom: 32 }}>Click it to activate your account.</div>

        <button className="sw-btn sw-btn-primary sw-btn-block">Open email app</button>
        <button className="sw-btn sw-btn-ghost sw-btn-block" style={{ marginTop: 10 }}>Resend email</button>

        <a href="#" onClick={e=>e.preventDefault()} style={{ marginTop: 28, color: 'var(--purple-600)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</a>
      </div>
    </Screen>
  );
}

function OnboardingStep1() {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Illustration */}
        <div style={{
          height: 320, background: 'var(--purple-50)', borderRadius: '0 0 32px 32px',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* concentric rings */}
          <div style={{
            position: 'absolute', width: 280, height: 280, borderRadius: '50%',
            border: '1.5px solid rgba(127,119,221,0.25)',
          }}/>
          <div style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            border: '1.5px solid rgba(127,119,221,0.35)',
          }}/>
          <div style={{
            position: 'absolute', width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(127,119,221,0.18)',
          }}/>
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(127,119,221,0.45)',
            position: 'relative',
          }}>
            <Icon.Walk size={48} color="white"/>
          </div>
        </div>

        <div style={{ flex: 1, padding: '32px 28px 28px', display: 'flex', flexDirection: 'column' }}>
          <div className="sw-dots" style={{ marginBottom: 24 }}>
            <span className="active"/><span/><span/>
          </div>
          <div className="sw-h1" style={{ marginBottom: 12, textAlign: 'center' }}>Stay safe while you walk.</div>
          <div className="sw-body" style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
            SafeWalk monitors your journey and alerts your trusted contacts if something seems wrong.
          </div>

          <div style={{ flex: 1 }}/>

          <button className="sw-btn sw-btn-primary sw-btn-block">Next</button>
        </div>
      </div>
    </Screen>
  );
}

function OnboardingStep2() {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '24px 28px 28px', display: 'flex', flexDirection: 'column' }}>
        <div className="sw-dots" style={{ marginBottom: 22, marginTop: 6 }}>
          <span/><span className="active"/><span/>
        </div>
        <div className="sw-h1" style={{ marginBottom: 10 }}>Add your trusted contacts.</div>
        <div className="sw-body" style={{ marginBottom: 24 }}>
          Choose up to 5 people who'll be notified if you need help. They don't need the app.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field">
            <label>Full name</label>
            <input placeholder="Mom" defaultValue="Sara Johnson"/>
          </div>
          <div className="sw-field">
            <label>Phone number</label>
            <input placeholder="+1 (555) 000-0000" defaultValue="+1 (204) 555-0192"/>
          </div>
          <div className="sw-field">
            <label>Email (optional)</label>
            <input placeholder="optional@email.com"/>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--purple-50)', borderRadius: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Set as primary</div>
              <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>Receives a voice call during emergencies</div>
            </div>
            <Toggle on={true}/>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <button className="sw-btn sw-btn-primary sw-btn-block">Add contact and continue</button>
        <button className="sw-btn sw-btn-text sw-btn-block" style={{ marginTop: 8 }}>Skip for now</button>
      </div>
    </Screen>
  );
}

function OnboardingStep3() {
  return (
    <Screen bg="white">
      <StatusBar dark/>
      {/* dimmed map underneath */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <MapCanvas/>
        <UserPin x="50%" y="50%"/>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}/>

      <div style={{ flex: 1 }}/>
      <div style={{
        background: 'white',
        borderRadius: '24px 24px 0 0',
        padding: '8px 24px 32px',
        position: 'relative',
        zIndex: 5,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
      }}>
        <div className="sw-sheet-handle"/>

        <div className="sw-dots" style={{ margin: '4px 0 18px' }}>
          <span/><span/><span className="active"/>
        </div>

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--purple-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Icon.Pin size={28} color="var(--purple-600)"/>
        </div>

        <div className="sw-h1" style={{ marginBottom: 10 }}>Allow location access.</div>
        <div className="sw-body" style={{ marginBottom: 16 }}>
          SafeWalk needs your location only while a walk is active. We never track you in the background.
        </div>

        <div style={{
          background: 'var(--purple-50)', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 22,
        }}>
          <Icon.Shield size={18} color="var(--purple-600)"/>
          <div style={{ fontSize: 12, color: 'var(--purple-800)', lineHeight: 1.5 }}>
            Location is only active during walks and deleted after 30 days.
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block">Allow location</button>
        <button className="sw-btn sw-btn-text sw-btn-block" style={{ marginTop: 4 }}>Not now</button>
      </div>
    </Screen>
  );
}

Object.assign(window, { SignInScreen, SignUpScreen, CheckEmailScreen, OnboardingStep1, OnboardingStep2, OnboardingStep3 });
