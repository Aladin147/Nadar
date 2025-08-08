**The Nadar Project: A Master Document**

**Project Version:** 1.0  
 **Date:** July 20, 2025

---

### **Executive Summary**

Nadar Project is a social company dedicated to equipping Morocco's blind with greater autonomy with the help of artificial intelligence. Our flagship product is Nadar, a mobile app acting like a smart pair of eyes to describe the world, read text aloud, and answer questions in everyday Moroccan Darija.

It is built on a two-pronged strategy:

**Nadar (The Mission):** A commercial-free, no-cost, and ethically designed access solution developed in partnership with the blind community. It shall be funded by grants, corporate social responsibility collaborations, and funding from foundations.

**Choufly (The Engine):** A commercial spin-off for the public and tourists in the future. It will be operating on a freemium principle where the revenue goes straight into supporting the on-going free-of-charge operation and upgrade of Nadar.

Our approach begins with an enduring MVP to prove the concept and gain critical user insights with a minimal tech stack for quick time to market. We shall then scale by a state-of-the-art multi-model AI architecture for long-term economic sustainability as well as for peak efficiency. The work is constrained by a strict user-centric privacy policy as well as an active safety paradigm.

---

### **1\. Vision & Mission Statement**

**Vision:** A world where blindness is no longer a barrier to autonomy and digital accessibility in Morocco and beyond.

**Mission:** To design and deploy an easy-to-use, culture-aware, and reliable AI-powered mobile companion for visually impaired individuals by translating the visible world into comprehensible audio data in the language they understand natively, i.e., Moroccan Darija.

---

### **2\. The Problem & The Solution**

**The Problem:** Blind individuals in Morocco lack an accessible digital platform that is sensitive to their distinctive surroundings and speaks in the language they are native to. Universal apps available today are low on the language depth of Darija as well as on Moroccan cultural nuance, constituting a gigantic accessibility gap.

**The Solution:** Nadar. A mobile application employing AI technology for providing real-time:

* **Scene Description:** Describing environments to support navigation and contextual interpretation.

* **Text Recognition (OCR):** Identifying menus, paperwork, drug labels, and road signs.

* **Interactive Q\&A:** Responding to individual questions from users regarding their surroundings.

---

### **3\. The Brand & Naming Strategy**

Dual-app strategy requires a distinct branding strategy for each product:

* **Nadar (نظر):** The name for our indispensable accessibility app. Meaning "vision" or "sight" in Arabic, it sounds serious, professional, and credible. It makes the app something serious where one can bank on for daily critical work.

* **Choufly (شوفلي):** Proposed name for our future commercial app. Meanting "look for me" in Darija, it feels contemporary, friendly, and consumer-SaaS. It is memorable as well as action-oriented, appropriate for a broader audience of tourists as well as general users.

---

### **4\. Product & User Flow**

User experience is designed to be voice-first, natural, and friction-less, natively integrated with native screen readers (VoiceOver/TalkBack).

* **Onboarding:** A simple, voice-based installation for access to the camera and microphone.

* **Core Loop:**

  * Tap Screen once: To get a general description of the scene.

  * Double-Tap Screen: To ask a specific follow-up question.

* **Reading Mode:** A single gesture (e.g., a swipe) places the app into a dedicated text-reading mode.

* **Feedback:** The software provides continuous auditory feedback (clicks, hums) so the user is never unaware of its status (listening, processing, speaking).

---

### **5\. Phased Roadmap**

**Phase 1: Demo & MVP (Months 0–6)**  
 **Target:** Validate the concept, secure powerful user testimonials, and secure start-up funding/sponsorship.  
 **Actions:**

* Create the base MVP with minimal needed features (description, OCR, Q\&A).

* Use a lean "Wrapper" architecture for speed.

* Partner with one of the local blind associations in Morocco so you can pilot with a small group of about \~20 users.

* Keep all usage data logged (anonymously) to create a data-based case for funding.

**Phase 2: The Public Alpha & The "Smart Gateway" (Months 6–12)**  
 **Target:** Refine the product based on feedback and migrate to a sustainable tech stack.  
 **Actions:**

* Begin multi-model "Smart Gateway" architecture development to help lower operational costs.

* Open up the audience by entering a larger public beta.

* Seek out formal CSR engagements based on the success of the MVP.

**Phase 3: Commercial Development & Complete Launch (Months 12+)**  
 **Target:** Release Nadar for public consumption and begin development on the commercial engine.  
 **Actions:**

* Official Launch on App Store and Play Store for Nadar 1.0.

* Begin work on the independent "Choufly" app.

* Make the economic cycle such that Choufly's earnings sustain Nadar.

---

### **6\. Technology Stack**

**Demo/MVP Stack (Speed & Validation Focus):**

* **Frontend:** React Native or Flutter (For cross-platform support)

* **Backend:** Python or Node.js (acting as an API "Wrapper")

* **AI Model:** Direct API calls to a SOTA model like OpenAI's GPT-4o for ultimate quality

* **Speech (STT/TTS):** Native on-device OS capabilities

**Production Stack (Specialization & Cost-Efficiency Focus):**

* **Architecture:** The "Smart Gateway" multi-model pipeline

  * **On-Device:** Compact, cost-free models for lightweight tasks (e.g., color detection)

  * **Vision Worker:** A self-hosted vision model for ground truth image-to-text description (e.g., Gemma, Phi-3 Vision)

  * **Reasoning Engine:** A large text-only LLM like Llama 3 for reasoning and interpretation

  * **DARI Expert:** An elegant model ("GemmaRoc") for translating logical output into natural Darija with empathy

---

### **7\. Sustainability Model**

Our charitable objects shall be funded by a multi-faceted funding strategy:

* **Starting Capital:** Seek out grants by tech-for-good programs (Microsoft for Startups, AWS Activate) and mission-driven foundations.

* **Corporate Sponsorship:** Forge long-term CSR relationships with Moroccan companies to cover operating costs in exchange for positive brand awareness.

* **Self-Sustaining Engine:** The revenue from the freemium "Choufly" app will go back into the company so the ad-free, cost-free future of Nadar is secured.

---

### **8\. The Ethical Core: Policies & Principles**

**Privacy Policy Principles:**

* **Ephemerality by Default:** All images are automatically deleted after processing for standard queries.

* **Explicit Opt-in Consent:** We will use anonymized data for model improvement purposes if and only if users opt-in explicitly. Any such option is revocable at all times.

* **Proactive Filtering for Safety:** An automated filter for safety shall check for and deny all malicious/NSFW content even if it is processed or stored, ensuring safety for our platform and users.

**Terms of Service & Policy Against Malicious Use:**

* **Forbidden Uses:** The ToS shall also strictly prohibit using it for spying, harassing, identifying individuals, or for any criminal activity.

* **Ethical Dampeners:** The system shall never be programmed to publish descriptive details about individuals, peek into private screens, or check IDs.

* **Resilience System:** Technical counter-measures against abuse shall comprise per-user rate limiting, global velocity checks, as well as auto-circuit breakers to lock out malicious accounts.

---

### **9\. Identified Gaps & Future Considerations**

We highlight areas for further focus:

* **Co-Design:** Shifting from consultations to active co-design by involving paid advisors from the blindness community.

* **Offline Capability:** Developing a smooth offline experience for offline scenarios.

* **Battery Efficiency:** Making the app as battery-efficient as possible.

* **Over-Trust Mitigation:** Integration of "confidence score" terms into the replies of the AI to foster user caution.

* **Governance:** Establishing a formal structure (foundation, board) for the long-term sustainability of the project beyond the launching team.

### **مشروع نظر: الوثيقة الرئيسية**

**نسخة المشروع:** 1.0  
**التاريخ:** 20 يوليوز 2025

---

#### **ملخص تنفيذي**

مشروع "نظر" هو مقاولة اجتماعية الهدف ديالها هو تمكين المكفوفين وضعاف البصر فالمغرب باستقلالية أكبر بمساعدة الذكاء الاصطناعي. المنتج الرئيسي ديالنا هو "نظر"، تطبيق للموبايل خدام بحال واحد العينين ذكيين باش يوصف العالم، يقرا النصوص بصوت عالي، ويجاوب على الأسئلة بالدارجة المغربية ديال كل نهار.  
المشروع مبني على استراتيجية فيها جوج ديال المسارات:

1. **نظر (المهمة):** هو تطبيق مجاني، بلا إشهارات، ومصمم بطريقة أخلاقية، تم التطوير ديالو بشراكة مع مجتمع المكفوفين. التمويل ديالو غادي يكون من خلال المنَح، ومبادرات المسؤولية الاجتماعية للشركات، والدعم من المؤسسات.  
2. **شوفلي (المحرّك):** هو نسخة تجارية غادي تخرج فالمستقبل للعموم والسياح. غادي يكون خدام بمبدأ "freemium" (مجاني مع خيارات مدفوعة)، والأرباح ديالو غادي تمشي مباشرة لدعم التشغيل المجاني وتطوير تطبيق "نظر".

المنهجية ديالنا كتبدا بنموذج أولي (MVP) باش نتحققو من الفكرة ونجمعو بيانات مهمة من عند المستعملين، مع استعمال بنية تقنية بسيطة باش نخرجو للسوق دغيا. من بعد، غادي نتاقلو لبنية ذكاء اصطناعي متطورة فيها بزاف ديال النماذج باش نضمنو الاستدامة المالية على المدى الطويل والكفاءة. العمل ديالنا كيحكموه جوج حوايج: سياسة خصوصية صارمة مركزة على المستعمل، ومنظومة أمان فعالة.

---

#### **1\. الرؤية والرسالة**

* **الرؤية:** عالم مابقاش فيه ضعف البصر عائق قدام الاستقلالية والولوج الرقمي فالمغرب وخارج المغرب.  
* **الرسالة:** تصميم وتوفير رفيق محمول ساهل فالاستعمال، واعي بالثقافة المحلية، وموثوق، خدام بالذكاء الاصطناعي، كيعاون الأشخاص المكفوفين وضعاف البصر عن طريق ترجمة العالم المرئي لبيانات صوتية مفهومة باللغة اللي كيفهموها، هي الدارجة المغربية.

#### **2\. المشكل والحل**

* **المشكل:** الأشخاص المكفوفين فالمغرب ماعندهمش أداة رقمية خاصة بهم اللي كتفهم المحيط ديالهم وكتهضر باللغة ديالهم. التطبيقات العالمية اللي كاينة اليوم ناقصة من ناحية فهم الدارجة والفروقات الثقافية المغربية، وهادشي كيخلق واحد الفجوة كبيرة فالولوجيات.  
* **الحل: تطبيق نظر.** تطبيق للموبايل كيستعمل الذكاء الاصطناعي باش يقدم بشكل فوري:  
  * **وصف المشهد:** كيوصف المحيط باش يعاون فالتنقل وفهم السياق.  
  * **التعرف على النصوص (OCR):** كيقرا المنيوات ديال المطاعم، الأوراق الإدارية، العلب ديال الدواء، وبلايك الشارع.  
  * **سؤال وجواب تفاعلي:** كيجاوب على الأسئلة الخاصة اللي كيطرحوها المستعملين على المحيط ديالهم.

#### **3\. العلامة التجارية واستراتيجية التسمية**

الاستراتيجية ديالنا اللي فيها جوج تطبيقات كتفرض علامة تجارية مختلفة لكل منتج:

* **نظر:** هو الاسم ديال التطبيق الأساسي ديالنا الموجه للمكفوفين. كلمة "نظر" كتوحي بالجدية، الاحترافية، والمصداقية. هاد السمية كتعطي للتطبيق طابع ديال أداة مهمة اللي يمكن الواحد يعتمد عليها فالمهام اليومية والحساسة.  
* **شوفلي:** هو الاسم المقترح للتطبيق التجاري فالمستقبل. المعنى ديالو هو "شوف ليا" بالدارجة، وكيعطيه طابع عصري، قريب من الناس، وبحال تطبيقات SaaS المعروفة. هو اسم ساهل فالعقلة وعملي، ومناسب لجمهور أوسع من السياح والمستعملين العاديين.

#### **4\. المنتج ومسار المستعمل**

تجربة المستعمل مصممة باش تكون صوتية فالمقام الأول، بديهية، وسلسة، ومدمجة بشكل كامل مع قارئات الشاشة ديال التيليفون (VoiceOver/TalkBack).

* **الإعداد الأولي:** طريقة إعداد بسيطة وموجهة بالصوت باش التطبيق ياخذ الإذن للكاميرا والميكروفون.  
* **الاستعمال الأساسي:**  
  * **ضغط على الشاشة مرة وحدة:** باش تاخذ وصف عام للمشهد.  
  * **ضغط على الشاشة جوج مرات:** باش تطرح سؤال محدد.  
* **وضعية القراءة:** حركة بسيطة (بحال السحبة swipe) كتدخل التطبيق لوضعية خاصة بقراءة النصوص.  
* **تفاعل صوتي:** التطبيق كيعطي إشارات صوتية مستمرة (نقرات، همهمة) باش المستعمل يكون ديما عارف الحالة ديالو (كيتصنت، كيفكر، كيهضر).

#### **5\. خارطة الطريق**

* **المرحلة 1: النموذج الأولي (MVP) (من الشهر 0 إلى 6\)**  
  * **الهدف:** التحقق من الفكرة، الحصول على شهادات قوية من المستعملين، وتأمين التمويل الأولي أو الرعاية.  
  * **الإجراءات:**  
    * تطوير MVP بالخصائص الأساسية (وصف، قراءة نصوص، سؤال وجواب).  
    * استعمال بنية "Wrapper" خفيفة باش نربحو الوقت.  
    * شراكة مع جمعية محلية للمكفوفين فالمغرب باش نجربو التطبيق مع مجموعة صغيرة ديال \~20 مستعمل.  
    * تسجيل كل بيانات الاستعمال (بدون هوية) باش نبنيو ملف قوي لطلب التمويل.  
* **المرحلة 2: النسخة ألفا و "البوابة الذكية" (من الشهر 6 إلى 12\)**  
  * **الهدف:** تحسين المنتج بناءً على الملاحظات والانتقال لبنية تقنية مستدامة.  
  * **الإجراءات:**  
    * البدء فتطوير بنية "البوابة الذكية" (Smart Gateway) باش نقصو من مصاريف التشغيل.  
    * توسيع قاعدة المستعملين لنسخة تجريبية (beta) عامة.  
    * عقد شراكات رسمية فإطار المسؤولية الاجتماعية للشركات بناءً على نجاح الـMVP.  
* **المرحلة 3: الإطلاق الكامل والتطوير التجاري (من الشهر 12 فما فوق)**  
  * **الهدف:** إطلاق "نظر" للعموم والبدء فتطوير المحرك التجاري.  
  * **الإجراءات:**  
    * الإطلاق الرسمي لـ "نظر 1.0" على App Store و Play Store.  
    * البدء فالعمل على تطبيق "شوفلي" المستقل.  
    * خلق دورة اقتصادية فين الأرباح ديال "شوفلي" كتمول الاستمرارية ديال "نظر".

#### **6\. البنية التقنية (Tech Stack)**

* **بنية النموذج الأولي (التركيز: السرعة والتجربة):**  
  * **الواجهة (Frontend):** React Native أو Flutter (باش يخدم على iOS و Android).  
  * **الخادم (Backend):** Node.js أو Python (كيخدم كـ "Wrapper" للـAPI).  
  * **نموذج الذكاء الاصطناعي:** استعمال مباشر لـAPI ديال شي نموذج رائد بحال GPT-4o ديال OpenAI لضمان الجودة.  
  * **الصوت (STT/TTS):** الاعتماد على القدرات المدمجة فالهاتف.  
* **بنية الإنتاج (التركيز: التخصص وتخفيض التكلفة):**  
  * **الهندسة:** بنية "البوابة الذكية" (Smart Gateway) المتعددة النماذج.  
  * **على الجهاز:** نماذج خفيفة ومجانية للمهام البسيطة (مثلا: تحديد الألوان).  
  * **عامل الرؤية (Vision Worker):** نموذج رؤية مستضاف ذاتيا (بحال Gemma أو Phi-3 Vision) لوصف الصور.  
  * **محرك المنطق (Reasoning Engine):** نموذج لغوي كبير خاص بالنصوص بحال Llama 3 للمنطق والاستنتاج.  
  * **خبير الدارجة:** نموذج معدل ("GemmaRoc") لترجمة المخرجات المنطقية لدارجة طبيعية وعاطفية.

#### **7\. نموذج الاستدامة**

المهمة ديالنا الغير ربحية غادي يتم التمويل ديالها باستراتيجية متعددة الأوجه:

1. **التمويل الأولي:** البحث عن منح من برامج دعم التكنولوجيا (بحال Microsoft for Startups, AWS Activate) والمؤسسات الاجتماعية.  
2. **الرعاية من الشركات:** بناء شراكات طويلة الأمد مع شركات مغربية فإطار المسؤولية الاجتماعية لتغطية تكاليف التشغيل مقابل الرفع من صورة العلامة التجارية ديالهم.  
3. **المحرك المستدام ذاتيا:** الأرباح من تطبيق "شوفلي" غادي يتم إعادة استثمارها لضمان مستقبل "نظر" المجاني وبدون إعلانات.

#### **8\. القلب الأخلاقي: السياسات والمبادئ**

* **مبادئ سياسة الخصوصية:**  
  1. **الحذف التلقائي هو القاعدة:** الصور كتمسح فورا بعد المعالجة بالنسبة للطلبات العادية.  
  2. **الموافقة الصريحة والاختيارية:** ما غاديش نستعملو أي بيانات مجهولة لتحسين النموذج إلا إذا وافق المستعمل بشكل صريح وواضح. ويمكن ليه يلغي هاد الموافقة فأي وقت.  
  3. **فلترة استباقية للأمان:** فلتر أمان أوتوماتيكي غادي يرصد ويمنع أي محتوى ضار/غير لائق قبل ما تتم المعالجة ديالو، وهكدا كنحميو المنصة والمستعملين.  
* **شروط الاستخدام وسياسة مكافحة الاستعمال الخبيث:**  
  1. **الاستخدامات الممنوعة:** شروط الاستخدام غادي تمنع بشكل صارم استعمال التطبيق للتجسس، التحرش، تحديد هوية الأفراد، أو أي نشاط غير قانوني.  
  2. **محددات أخلاقية:** النظام غادي يكون مبرمج باش يرفض إعطاء تفاصيل وصفية دقيقة للأشخاص، أو قراءة الشاشات الخاصة، أو التحقق من الهويات.  
  3. **نظام الصمود:** غادي نطبقو إجراءات تقنية لمنع سوء الاستخدام، منها تحديد عدد الطلبات لكل مستعمل، ومراقبة السرعة العامة للطلبات، وقواطع أوتوماتيكية لتجميد الحسابات الخبيثة.

#### **9\. الثغرات ونقط للتفكير**

كنعترفو بوجود مجالات كتطلب تركيز أكبر فالمستقبل:

* **التصميم التشاركي:** الانتقال من أخذ الملاحظات إلى تصميم تشاركي حقيقي عبر إشراك مستشارين مدفوعي الأجر من مجتمع المكفوفين.  
* **العمل بدون إنترنت:** تطوير وضعية "offline" سلسة للحالات اللي ما فيهاش كونيكسيون.  
* **استهلاك البطارية:** تحسين التطبيق باش ما يستهلكش البطارية بزاف.  
* **تخفيف الثقة المفرطة:** دمج لغة كتعبر على "مستوى الثقة" فالأجوبة ديال الذكاء الاصطناعي لتشجيع حذر المستعمل.  
* **الحكامة:** تأسيس هيكل رسمي (مؤسسة، مجلس إدارة) لضمان استمرارية المشروع على المدى الطويل

