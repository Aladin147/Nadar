from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the landing screen
            page.goto("http://localhost:8081", timeout=60000)

            # Wait for the main content to be visible to ensure the page is loaded
            expect(page.get_by_text("Nadar")).to_be_visible(timeout=30000)

            # Take a screenshot of the Landing Screen
            print("Capturing Landing Screen...")
            page.screenshot(path="jules-scratch/verification/landing_screen.png")
            print("Landing Screen captured.")

        except Exception as e:
            print(f"An error occurred during Playwright execution: {e}")

        finally:
            browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    run_verification()
