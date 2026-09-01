// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let arguments = std::env::args().collect::<Vec<_>>();
    if arguments
        .iter()
        .any(|argument| argument == "--inspect-json")
        || arguments
            .iter()
            .any(|argument| argument == "--inspect-summary")
    {
        let summary_only = arguments
            .iter()
            .any(|argument| argument == "--inspect-summary");
        match app_lib::center::scan().and_then(|snapshot| {
            let output = if summary_only {
                serde_json::json!({
                    "centerPath": snapshot.center_path,
                    "summary": snapshot.summary,
                    "tools": snapshot.tools,
                })
            } else {
                serde_json::to_value(snapshot)
                    .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?
            };
            serde_json::to_string_pretty(&output)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))
        }) {
            Ok(snapshot) => {
                println!("{snapshot}");
                return;
            }
            Err(error) => {
                eprintln!("inspection failed: {error}");
                std::process::exit(2);
            }
        }
    }
    app_lib::run();
}
